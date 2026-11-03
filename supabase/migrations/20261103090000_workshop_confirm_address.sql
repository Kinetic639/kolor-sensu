-- A seat taken with a made-up address cannot fill a workshop (#269,
-- Warsztat · 5, card 5), as "Zapłacę później" cannot block a visit
-- (20261022200000_pay_later_limits):
--   - a seat reserved to pay later, or a free one, is held for 30 minutes
--     only, until the participant confirms it from the link in its first
--     e-mail (the address is real); not confirmed, it lapses quietly, as a
--     hold does, and nobody is written to;
--   - a seat taken from an e-mail's link (a waitlist offer) needs no
--     confirming: the address is proven already;
--   - one person (by e-mail, phone or visitor key) has at most two unpaid
--     seats at a time; a third is paid at once, and the admins are told;
--   - of free seats, at most two wait for their confirming at a time;
--   - the leaders hear of a sign-up once it is confirmed.

ALTER TABLE public.workshop_registrations
  ADD COLUMN confirm_by timestamptz,
  ADD COLUMN reserved_by_key text
    CONSTRAINT workshop_registrations_reserved_by_key_length
      CHECK (reserved_by_key IS NULL OR char_length(reserved_by_key) BETWEEN 8 AND 128);

COMMENT ON COLUMN public.workshop_registrations.confirm_by IS
  'A seat not confirmed from its e-mail yet: it lapses at this time.';
COMMENT ON COLUMN public.workshop_registrations.reserved_by_key IS
  'The keyed hash of the visitor who took the seat (never the address itself).';

GRANT SELECT (confirm_by) ON public.workshop_registrations TO authenticated;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'booked', 'reserved', 'centre_booked', 'paid', 'cancelled',
    'rescheduled', 'refunded', 'profile_submitted', 'profile_approved',
    'profile_rejected', 'visit_to_close', 'unpaid_limit', 'disputed',
    'dispute_closed', 'workshop_signup', 'workshop_cancelled',
    'workshop_full', 'workshop_minimum', 'workshop_no_link',
    'workshop_unpaid_limit'
  ]));

-- Whether a token is an e-mail's link (not the browser's own token).
CREATE FUNCTION private.workshop_token_from_email(p_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshop_emails AS e
    WHERE e.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
  );
$$;

REVOKE ALL ON FUNCTION private.workshop_token_from_email(text) FROM PUBLIC, anon, authenticated;

-- How many other seats the same person (by e-mail, phone or visitor key)
-- has waiting: unpaid ones, or (p_unconfirmed) ones not confirmed yet.
-- Each of the three is locked, so two at once count each other.
CREATE FUNCTION private.workshop_seats_waiting(
  p_registration public.workshop_registrations, p_client_key text, p_unconfirmed boolean
)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_email text := lower(btrim(p_registration.client_email));
  v_phone text := private.phone_key(p_registration.client_phone);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('workshop:waiting:' || v_email, 0));
  IF v_phone <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('workshop:waiting:phone:' || v_phone, 0));
  END IF;
  IF p_client_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('workshop:waiting:visitor:' || p_client_key, 0));
  END IF;
  RETURN (
    SELECT count(*)::integer FROM public.workshop_registrations AS other
    WHERE other.id <> p_registration.id
      AND other.booked_by = 'client'
      AND (
        (p_unconfirmed AND other.confirm_by > now() AND other.status IN ('held', 'awaiting_payment'))
        OR (NOT p_unconfirmed AND other.status = 'awaiting_payment' AND other.payment_due_at > now())
      )
      AND (
        lower(btrim(other.client_email)) = v_email
        OR (v_phone <> '' AND private.phone_key(other.client_phone) = v_phone)
        OR (p_client_key IS NOT NULL AND other.reserved_by_key = p_client_key)
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.workshop_seats_waiting(public.workshop_registrations, text, boolean) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------ paying later

DROP FUNCTION public.reserve_workshop_seat(text);

CREATE FUNCTION public.reserve_workshop_seat(p_access_token text, p_client_key text DEFAULT NULL)
RETURNS TABLE (reference text, payment_due_at timestamptz, confirm_by timestamptz, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_due timestamptz;
  v_confirm_by timestamptz;
BEGIN
  IF p_client_key IS NOT NULL AND char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is 8 to 128 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_registration := private.ready_workshop_seat(p_access_token);
  IF v_registration.confirm_by IS NOT NULL THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_registration.price_minor = 0 THEN
    RAISE EXCEPTION 'A free seat is confirmed, not reserved' USING HINT = 'free';
  END IF;
  SELECT w.starts_at - private.workshop_notice() INTO v_due
  FROM public.workshops AS w WHERE w.id = v_registration.workshop_id;
  IF v_due <= now() THEN
    RAISE EXCEPTION 'This workshop is paid at once' USING HINT = 'pay_now_required';
  END IF;

  -- At most two unpaid seats per person: a third is paid now, and the
  -- admins hear of it once per seat.
  IF private.workshop_seats_waiting(v_registration, p_client_key, false) >= 2 THEN
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT admin.user_id, 'admin', NULL::uuid, 'workshop_unpaid_limit', 'system',
      jsonb_strip_nulls(jsonb_build_object(
        'workshop_id', w.id,
        'reference', v_registration.reference,
        'starts_at', w.starts_at,
        'mode', w.modality,
        'client_name', v_registration.client_name,
        'service_name', w.title
      ))
    FROM public.workshops AS w
    CROSS JOIN (SELECT DISTINCT role.user_id FROM public.user_roles AS role
                WHERE role.role = 'admin') AS admin
    WHERE w.id = v_registration.workshop_id
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications AS sent
        WHERE sent.kind = 'workshop_unpaid_limit'
          AND sent.details->>'reference' = v_registration.reference
      );
    RETURN QUERY SELECT v_registration.reference, NULL::timestamptz, NULL::timestamptz, 'pay_now'::text;
    RETURN;
  END IF;

  -- Taken from an e-mail's link, the address is proven; otherwise the seat
  -- waits 30 minutes for its confirming.
  IF NOT private.workshop_token_from_email(p_access_token) THEN
    v_confirm_by := least(now() + interval '30 minutes', v_due);
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'awaiting_payment', hold_expires_at = NULL, offer_expires_at = NULL,
      payment_due_at = coalesce(v_confirm_by, v_due), confirm_by = v_confirm_by,
      reserved_by_key = p_client_key
  WHERE id = v_registration.id;
  RETURN QUERY SELECT v_registration.reference, v_due, v_confirm_by, 'reserved'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_workshop_seat(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_workshop_seat(text, text) TO service_role;

-- ------------------------------------------------------------ free seats

DROP FUNCTION public.confirm_free_workshop_seat(text);

CREATE FUNCTION public.confirm_free_workshop_seat(p_access_token text, p_client_key text DEFAULT NULL)
RETURNS TABLE (reference text, confirm_by timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_confirm_by timestamptz;
BEGIN
  IF p_client_key IS NOT NULL AND char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is 8 to 128 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_registration := private.ready_workshop_seat(p_access_token);
  IF v_registration.confirm_by IS NOT NULL THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_registration.price_minor > 0 THEN
    RAISE EXCEPTION 'This seat is paid for' USING HINT = 'payment_required';
  END IF;

  IF private.workshop_token_from_email(p_access_token) THEN
    UPDATE public.workshop_registrations
    SET status = 'confirmed', confirmed_at = now(),
        hold_expires_at = NULL, offer_expires_at = NULL
    WHERE id = v_registration.id;
    RETURN QUERY SELECT v_registration.reference, NULL::timestamptz;
    RETURN;
  END IF;

  IF private.workshop_seats_waiting(v_registration, p_client_key, true) >= 2 THEN
    RAISE EXCEPTION 'The earlier sign-ups are to be confirmed first' USING HINT = 'too_many_unconfirmed';
  END IF;
  SELECT least(now() + interval '30 minutes', w.starts_at) INTO v_confirm_by
  FROM public.workshops AS w WHERE w.id = v_registration.workshop_id;
  -- Still a hold, for 30 minutes: it lapses as a hold does.
  UPDATE public.workshop_registrations
  SET status = 'held', hold_expires_at = v_confirm_by, offer_expires_at = NULL,
      confirm_by = v_confirm_by, reserved_by_key = p_client_key
  WHERE id = v_registration.id;
  RETURN QUERY SELECT v_registration.reference, v_confirm_by;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_free_workshop_seat(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_free_workshop_seat(text, text) TO service_role;

-- ------------------------------------------------------------ confirming

-- "Potwierdzam zapis", from the e-mail's link only: a seat to pay later is
-- then paid by seven days before; a free one is confirmed. 'reserved' or
-- 'confirmed'; null when there is nothing to confirm (done already,
-- lapsed, or not the e-mail's link).
CREATE FUNCTION public.confirm_workshop_seat(p_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_workshop_id uuid;
  v_registration public.workshop_registrations%ROWTYPE;
  v_due timestamptz;
BEGIN
  SELECT e.registration_id INTO v_id FROM public.workshop_emails AS e
  WHERE e.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');
  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;
  -- The workshop first, then the seat, as everything else locks them.
  SELECT r.workshop_id INTO v_workshop_id FROM public.workshop_registrations AS r WHERE r.id = v_id;
  PERFORM 1 FROM public.workshops WHERE id = v_workshop_id FOR UPDATE;
  SELECT * INTO v_registration FROM public.workshop_registrations WHERE id = v_id FOR UPDATE;
  IF v_registration.confirm_by IS NULL OR v_registration.confirm_by <= now() THEN
    RETURN NULL;
  END IF;

  IF v_registration.status = 'awaiting_payment' THEN
    SELECT w.starts_at - private.workshop_notice() INTO v_due
    FROM public.workshops AS w WHERE w.id = v_workshop_id;
    UPDATE public.workshop_registrations
    SET payment_due_at = greatest(v_due, v_registration.payment_due_at), confirm_by = NULL
    WHERE id = v_id;
    PERFORM private.notify_workshop(v_workshop_id, v_id, 'workshop_signup', 'client');
    RETURN 'reserved';
  END IF;

  IF v_registration.status = 'held' THEN
    BEGIN
      UPDATE public.workshop_registrations
      SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL, confirm_by = NULL
      WHERE id = v_id;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'Already signed up for this workshop' USING HINT = 'already_registered';
    END;
    RETURN 'confirmed';
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_workshop_seat(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_workshop_seat(text) TO service_role;

-- Until when a seat waits for its confirming, or null (nothing to confirm).
CREATE FUNCTION public.workshop_seat_confirm_by(p_token text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.confirm_by FROM public.workshop_registrations AS r
  WHERE r.id = private.workshop_registration_id(p_token)
    AND r.confirm_by > now()
    AND r.status IN ('held', 'awaiting_payment');
$$;

REVOKE ALL ON FUNCTION public.workshop_seat_confirm_by(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_seat_confirm_by(text) TO service_role;

-- ------------------------------------------------------------ lapsing

-- (The body of 20261023080000_workshop_registrations; a seat to pay later
-- not confirmed in time lapses quietly, as a hold does: expired, not
-- cancelled, so no e-mail goes to the address nobody confirmed.)
CREATE OR REPLACE FUNCTION private.expire_workshop_registrations(p_workshop_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.workshop_registrations AS r
  SET status = CASE WHEN r.status = 'awaiting_payment' AND r.confirm_by IS NULL
        THEN 'cancelled' ELSE 'expired' END::public.workshop_registration_status,
      cancelled_at = CASE WHEN r.status = 'awaiting_payment' AND r.confirm_by IS NULL THEN now() END,
      cancelled_by = CASE WHEN r.status = 'awaiting_payment' AND r.confirm_by IS NULL THEN 'system' END,
      payment_due_at = CASE WHEN r.confirm_by IS NULL THEN r.payment_due_at END,
      confirm_by = NULL
  WHERE (p_workshop_id IS NULL OR r.workshop_id = p_workshop_id)
    AND (
      (r.status = 'held' AND r.hold_expires_at <= now())
      OR (r.status = 'offered' AND r.offer_expires_at <= now())
      OR (r.status = 'awaiting_payment' AND r.payment_due_at <= now())
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- (The body of 20261023170000_workshop_after_signup; a seat not confirmed
-- yet is no sign-up: the leaders hear of it once confirmed.)
CREATE OR REPLACE FUNCTION private.workshop_registration_noticed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
BEGIN
  IF (NEW.status IN ('confirmed', 'awaiting_payment')
      AND OLD.status IN ('held', 'offered', 'waitlisted')
      AND NEW.confirm_by IS NULL)
     -- Paid from its link before it was confirmed.
     OR (NEW.status = 'confirmed' AND OLD.status = 'awaiting_payment' AND OLD.confirm_by IS NOT NULL)
  THEN
    PERFORM private.notify_workshop(NEW.workshop_id, NEW.id, 'workshop_signup',
      CASE WHEN NEW.booked_by = 'centre' THEN 'centre' ELSE 'client' END);
  ELSIF NEW.status = 'cancelled'
     AND OLD.status IN ('confirmed', 'awaiting_payment')
     AND NEW.cancelled_by = 'client'
  THEN
    PERFORM private.notify_workshop(NEW.workshop_id, NEW.id, 'workshop_cancelled', 'client');
  END IF;

  IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    SELECT * INTO v_workshop FROM public.workshops WHERE id = NEW.workshop_id;
    IF private.workshop_seats_taken(NEW.workshop_id) >= v_workshop.capacity
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications AS sent
         WHERE sent.kind = 'workshop_full'
           AND sent.details->>'workshop_id' = NEW.workshop_id::text
       )
    THEN
      PERFORM private.notify_workshop(NEW.workshop_id, NULL, 'workshop_full', 'system');
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- A seat paid, cancelled or lapsed waits for no confirming any more.
CREATE FUNCTION private.workshop_seat_settled()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.confirm_by := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.workshop_seat_settled() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workshop_seat_settled
  BEFORE UPDATE OF status ON public.workshop_registrations
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('held', 'awaiting_payment') AND NEW.confirm_by IS NOT NULL)
  EXECUTE FUNCTION private.workshop_seat_settled();

-- ------------------------------------------------------------ the e-mail

-- (The body of 20261102090000_workshop_transfer_leader_dispute, with the
-- seat's confirm_by, and 'reserved' due for a free seat waiting for its
-- confirming too: that e-mail carries the link that confirms it.)
DROP FUNCTION public.claim_workshop_email(text, text);

CREATE FUNCTION public.claim_workshop_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text,
  manage_token text,
  status public.workshop_registration_status,
  client_name text,
  client_email text,
  workshop_title text,
  workshop_slug text,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  room_name text,
  leaders text,
  price_minor integer,
  paid_minor integer,
  currency_code text,
  payment_due_at timestamptz,
  waitlist_position integer,
  offer_expires_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  refund_due_minor integer,
  refunded_minor integer,
  refund_when_replaced boolean,
  meeting_url text,
  paid_outside boolean,
  location_directions text,
  confirm_by timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_token text;
  v_due boolean;
BEGIN
  IF p_kind NOT IN (
    'confirmation', 'reserved', 'waitlisted', 'offered', 'payment_reminder',
    'reminder', 'cancelled', 'rescheduled', 'refunded', 'seat_lost', 'leader_changed'
  ) THEN
    RAISE EXCEPTION 'Unknown e-mail %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_registration FROM public.workshop_registrations AS r
  WHERE r.reference = p_reference FOR UPDATE;
  IF NOT FOUND OR v_registration.client_email IS NULL THEN
    RETURN;
  END IF;
  -- Whether the registration is in the state the e-mail is about.
  v_due := CASE p_kind
    WHEN 'confirmation' THEN v_registration.status = 'confirmed'
    WHEN 'reserved' THEN v_registration.status = 'awaiting_payment'
      OR (v_registration.status = 'held' AND v_registration.confirm_by > now())
    WHEN 'waitlisted' THEN v_registration.status = 'waitlisted'
    WHEN 'offered' THEN v_registration.status = 'offered' AND v_registration.offer_expires_at > now()
    WHEN 'payment_reminder' THEN v_registration.status = 'awaiting_payment' AND v_registration.payment_due_at > now()
    WHEN 'reminder' THEN v_registration.status = 'confirmed'
    WHEN 'cancelled' THEN v_registration.status = 'cancelled'
    WHEN 'rescheduled' THEN v_registration.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
    WHEN 'leader_changed' THEN v_registration.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
      AND v_registration.leader_changed_at IS NOT NULL
    -- A payment that came too late for its seat, given back (#196).
    WHEN 'seat_lost' THEN v_registration.status <> 'confirmed' AND EXISTS (
      SELECT 1 FROM public.workshop_payments AS p
      WHERE p.registration_id = v_registration.id AND p.refunded_minor > 0
    )
    ELSE v_registration.status = 'cancelled' AND v_registration.refunded_minor > 0
  END;
  IF NOT v_due THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_emails AS e
    WHERE e.registration_id = v_registration.id AND e.kind = p_kind
      AND e.superseded_at IS NULL
      AND (e.sent_at IS NOT NULL OR e.claimed_at > now() - interval '10 minutes')
  ) THEN
    RETURN;
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  INSERT INTO public.workshop_emails (registration_id, kind, token_hash)
  VALUES (v_registration.id, p_kind, extensions.digest(v_token, 'sha256'))
  ON CONFLICT (registration_id, kind) WHERE superseded_at IS NULL DO UPDATE
    SET token_hash = EXCLUDED.token_hash, claimed_at = now();

  RETURN QUERY
  SELECT v_registration.reference, v_token, v_registration.status,
    v_registration.client_name, v_registration.client_email,
    w.title, w.slug, w.modality, w.starts_at, w.ends_at,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    room.name,
    (SELECT string_agg(private.specialist_display_name(leader.id), ', ' ORDER BY leader.main DESC, leader.id)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader),
    v_registration.price_minor, v_registration.paid_minor, v_registration.currency_code,
    v_registration.payment_due_at,
    CASE WHEN v_registration.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = w.id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (v_registration.waitlisted_at, v_registration.created_at)
    ) END,
    v_registration.offer_expires_at,
    v_registration.cancelled_by,
    w.cancel_reason,
    v_registration.refund_due_minor,
    -- A lost seat's money is its payment's, never the registration's.
    greatest(v_registration.refunded_minor, (
      SELECT coalesce(sum(p.refunded_minor), 0)::integer
      FROM public.workshop_payments AS p WHERE p.registration_id = v_registration.id
    )),
    v_registration.refund_when_replaced,
    CASE WHEN v_registration.status = 'confirmed' AND w.status = 'published'
      THEN (SELECT link.meeting_url FROM public.workshop_online_links AS link WHERE link.workshop_id = w.id) END,
    v_registration.paid_outside,
    location.directions,
    v_registration.confirm_by
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = v_registration.workshop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_workshop_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workshop_email(text, text) TO service_role;
