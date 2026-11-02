-- Workshop map, columns 8 to 10.
--
-- Passing a seat on (Warsztat · 8, card 4): the participant names the new
-- person, who gets an invitation link and accepts the workshop's rules and
-- the privacy notice before the workshop. Until then the seat stays the
-- participant's. Accepting moves the seat: the new person's details, their
-- link as the seat's, and the participant's e-mails (and so their links)
-- gone.
--
-- A new leader (Warsztat · 9, card 5): everyone on the workshop hears of
-- it in a "leader_changed" e-mail and may give the seat up with a full
-- refund, as after a new date.
--
-- A disputed payment (Warsztat · 10, card 5): the seat keeps the dispute's
-- state, so the admin sees it on the participant.
--
-- claim_workshop_email, list_due_workshop_emails and record_dispute are
-- their whole current bodies (20261101140000, 20261023150000) with these.

-- ------------------------------------------------------------ passing on

CREATE TABLE public.workshop_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.workshop_registrations (id) ON DELETE CASCADE,
  first_name text NOT NULL CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(email) <= 254),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 40),
  token_hash bytea NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workshop_transfers IS
  'A seat offered to someone else, until they accept the rules (service role only). Gone once accepted, or once the seat is.';

-- One open invitation per seat: a new one replaces it.
CREATE UNIQUE INDEX workshop_transfers_seat_key ON public.workshop_transfers (registration_id);

ALTER TABLE public.workshop_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_transfers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_transfers FROM anon, authenticated;

DROP FUNCTION public.transfer_workshop_seat(text, text, text, text);
DROP FUNCTION public.transfer_workshop_seat(text, text, text, text, text);

-- The participant offers the seat; the invitation's token, for its e-mail.
CREATE FUNCTION public.transfer_workshop_seat(
  p_access_token text, p_first_name text, p_last_name text, p_email text, p_phone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_token text;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR v_registration.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Only a booked seat can be passed on' USING HINT = 'not_transferable';
  END IF;
  IF now() >= (SELECT starts_at FROM public.workshops WHERE id = v_registration.workshop_id) THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);
  DELETE FROM public.workshop_transfers WHERE registration_id = v_registration.id;
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  BEGIN
    INSERT INTO public.workshop_transfers (registration_id, first_name, last_name, email, phone, token_hash)
    VALUES (v_registration.id, btrim(p_first_name), btrim(p_last_name),
      lower(btrim(p_email)), nullif(btrim(p_phone), ''), extensions.digest(v_token, 'sha256'));
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  RETURN v_token;
END;
$$;

-- An invitation by its token: for its e-mail and its page. Nothing for a
-- wrong token or an accepted one; open says whether it can still be.
CREATE FUNCTION public.workshop_transfer(p_token text)
RETURNS TABLE (
  reference text,
  first_name text,
  last_name text,
  email text,
  from_name text,
  workshop_title text,
  workshop_slug text,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  open boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.reference, t.first_name, t.last_name, t.email, r.client_name,
    w.title, w.slug, w.modality, w.starts_at, w.ends_at,
    r.status IN ('confirmed', 'awaiting_payment') AND w.starts_at > now()
  FROM public.workshop_transfers AS t
  JOIN public.workshop_registrations AS r ON r.id = t.registration_id
  JOIN public.workshops AS w ON w.id = r.workshop_id
  WHERE t.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256');
$$;

-- The new person accepts: the seat is theirs, with the rules and the
-- privacy notice accepted now; their invitation's link is the seat's.
CREATE FUNCTION public.accept_workshop_transfer(
  p_token text, p_terms boolean, p_privacy boolean
)
RETURNS TABLE (reference text, status public.workshop_registration_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_transfer public.workshop_transfers%ROWTYPE;
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  SELECT * INTO v_transfer FROM public.workshop_transfers AS t
  WHERE t.token_hash = extensions.digest(coalesce(p_token, ''), 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such invitation' USING HINT = 'not_found';
  END IF;
  IF NOT coalesce(p_terms, false) OR NOT coalesce(p_privacy, false) THEN
    RAISE EXCEPTION 'The rules and the privacy notice come first' USING HINT = 'consent_required';
  END IF;
  SELECT * INTO v_registration FROM public.workshop_registrations AS r
  WHERE r.id = v_transfer.registration_id
  FOR UPDATE;
  IF v_registration.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Only a booked seat can be passed on' USING HINT = 'not_transferable';
  END IF;
  IF now() >= (SELECT w.starts_at FROM public.workshops AS w WHERE w.id = v_registration.workshop_id) THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, v_transfer.email, v_registration.id);

  PERFORM private.remember_name_parts(v_transfer.first_name, v_transfer.last_name);
  UPDATE public.workshop_registrations AS r
  SET client_name = private.full_name(v_transfer.first_name, v_transfer.last_name),
      client_email = v_transfer.email,
      client_phone = v_transfer.phone,
      client_notes = NULL,
      terms_accepted_at = now(),
      privacy_accepted_at = now(),
      access_token_hash = v_transfer.token_hash
  WHERE r.id = v_registration.id;
  DELETE FROM public.workshop_transfers AS t WHERE t.id = v_transfer.id;
  -- The participant's e-mails and their links go; the new person's come.
  DELETE FROM public.workshop_emails AS e WHERE e.registration_id = v_registration.id;

  RETURN QUERY SELECT v_registration.reference, v_registration.status;
END;
$$;

-- A seat no longer booked, or its data forgotten: its invitation goes.
CREATE FUNCTION private.workshop_seat_left()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.workshop_transfers AS t WHERE t.registration_id = NEW.id;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.workshop_seat_left() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workshop_seat_left
  AFTER UPDATE OF status, forgotten_at ON public.workshop_registrations
  FOR EACH ROW
  WHEN (NEW.status NOT IN ('confirmed', 'awaiting_payment') OR NEW.forgotten_at IS NOT NULL)
  EXECUTE FUNCTION private.workshop_seat_left();

REVOKE ALL ON FUNCTION public.transfer_workshop_seat(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_workshop_seat(text, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.workshop_transfer(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_transfer(text) TO service_role;
REVOKE ALL ON FUNCTION public.accept_workshop_transfer(text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_workshop_transfer(text, boolean, boolean) TO service_role;

-- ------------------------------------------------------------ a new leader

ALTER TABLE public.workshop_registrations ADD COLUMN leader_changed_at timestamptz;
GRANT SELECT (leader_changed_at) ON public.workshop_registrations TO authenticated;

CREATE FUNCTION private.workshop_leader_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.workshop_registrations AS r
  SET leader_changed_at = now(), refund_any_time = true
  WHERE r.workshop_id = NEW.id
    AND r.status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered');
  -- A second change is told too.
  UPDATE public.workshop_emails AS e
  SET superseded_at = now()
  FROM public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.workshop_id = NEW.id
    AND e.kind = 'leader_changed' AND e.superseded_at IS NULL;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.workshop_leader_changed() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER workshop_leader_changed
  AFTER UPDATE OF specialist_id ON public.workshops
  FOR EACH ROW
  WHEN (NEW.status = 'published' AND OLD.specialist_id IS DISTINCT FROM NEW.specialist_id)
  EXECUTE FUNCTION private.workshop_leader_changed();

ALTER TABLE public.workshop_emails DROP CONSTRAINT workshop_emails_kind_check;
ALTER TABLE public.workshop_emails ADD CONSTRAINT workshop_emails_kind_check CHECK (
  kind IN (
    'confirmation', 'reserved', 'waitlisted', 'offered', 'payment_reminder',
    'reminder', 'cancelled', 'rescheduled', 'refunded', 'seat_lost', 'leader_changed'
  )
);

-- (The body of 20261101140000_workshop_links_and_bounces, with leader_changed.)
CREATE OR REPLACE FUNCTION public.claim_workshop_email(p_reference text, p_kind text)
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
  location_directions text
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
    location.directions
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = v_registration.workshop_id;
END;
$$;

-- (The body of 20261101140000_workshop_links_and_bounces, with leader_changed.)
CREATE OR REPLACE FUNCTION public.list_due_workshop_emails()
RETURNS TABLE (reference text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH due AS (
    SELECT r.id, r.reference, 'offered'::text AS kind
    FROM public.workshop_registrations AS r
    WHERE r.status = 'offered' AND r.offer_expires_at > now()
    UNION ALL
    SELECT r.id, r.reference, 'payment_reminder'
    FROM public.workshop_registrations AS r
    WHERE r.status = 'awaiting_payment' AND r.payment_due_at > now()
      AND r.payment_due_at - interval '3 days' <= now()
      -- Not when reserved within those three days (its e-mail just went).
      AND r.created_at < r.payment_due_at - interval '3 days'
    UNION ALL
    SELECT r.id, r.reference, 'reminder'
    FROM public.workshop_registrations AS r
    JOIN public.workshops AS w ON w.id = r.workshop_id
    WHERE r.status = 'confirmed' AND w.status = 'published'
      AND w.starts_at > now() AND w.starts_at - interval '24 hours' <= now()
      AND (w.modality <> 'online' OR private.workshop_has_link(w.id))
    UNION ALL
    SELECT r.id, r.reference, 'cancelled'
    FROM public.workshop_registrations AS r
    WHERE r.status = 'cancelled' AND r.cancelled_at > now() - interval '3 days'
      -- Booked, paid or waiting at some point (not a hold given up).
      AND (r.confirmed_at IS NOT NULL OR r.payment_due_at IS NOT NULL OR r.waitlisted_at IS NOT NULL)
    UNION ALL
    SELECT r.id, r.reference, 'rescheduled'
    FROM public.workshop_registrations AS r
    WHERE r.rescheduled_at IS NOT NULL AND r.rescheduled_at > now() - interval '3 days'
      AND r.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
    UNION ALL
    SELECT r.id, r.reference, 'leader_changed'
    FROM public.workshop_registrations AS r
    WHERE r.leader_changed_at IS NOT NULL AND r.leader_changed_at > now() - interval '3 days'
      AND r.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
    UNION ALL
    -- A payment too late for its seat, refunded in the last three days.
    SELECT r.id, r.reference, 'seat_lost'
    FROM public.workshop_registrations AS r
    WHERE r.status <> 'confirmed' AND EXISTS (
      SELECT 1 FROM public.workshop_payments AS p
      WHERE p.registration_id = r.id AND p.refunded_minor > 0
        AND p.updated_at > now() - interval '3 days'
    )
  )
  SELECT due.reference, due.kind FROM due
  JOIN public.workshop_registrations AS r ON r.id = due.id
  WHERE r.client_email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.workshop_emails AS e
      WHERE e.registration_id = due.id AND e.kind = due.kind
        AND e.superseded_at IS NULL
    );
$$;

-- ------------------------------------------------------------ disputes

ALTER TABLE public.workshop_registrations
  ADD COLUMN payment_disputed_at timestamptz,
  ADD COLUMN payment_dispute_status text
    CHECK (payment_dispute_status IS NULL OR char_length(payment_dispute_status) <= 40);
GRANT SELECT (payment_disputed_at, payment_dispute_status) ON public.workshop_registrations TO authenticated;

-- (The body of 20261023150000_disputes_any_payment; a seat keeps the
-- dispute's state.)
CREATE OR REPLACE FUNCTION public.record_dispute(
  p_payment_intent_id text, p_dispute_id text, p_status text,
  p_amount_minor integer, p_reason text, p_closed boolean,
  p_reference text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_seat public.workshop_registrations%ROWTYPE;
  v_kind text := CASE WHEN p_closed THEN 'dispute_closed' ELSE 'payment_disputed' END;
  v_notice text := CASE WHEN p_closed THEN 'dispute_closed' ELSE 'disputed' END;
  v_money jsonb := jsonb_strip_nulls(jsonb_build_object(
    'dispute_status', p_status,
    'dispute_reason', p_reason,
    'amount_minor', p_amount_minor
  ));
BEGIN
  SELECT visit.* INTO v_visit
  FROM public.payments AS payment
  JOIN public.appointments AS visit ON visit.id = payment.appointment_id
  WHERE payment.payment_intent_id = p_payment_intent_id;
  IF NOT FOUND AND p_reference IS NOT NULL THEN
    SELECT * INTO v_visit FROM public.appointments WHERE reference = p_reference;
  END IF;

  IF v_visit.id IS NOT NULL THEN
    PERFORM private.log_appointment_event(v_visit.id, v_kind, 'payment',
      jsonb_strip_nulls(jsonb_build_object(
        'dispute_id', p_dispute_id, 'status', p_status,
        'amount_minor', p_amount_minor, 'reason', p_reason
      )));
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT admin.user_id, 'admin', v_visit.id, v_notice, 'payment',
      v_money || jsonb_strip_nulls(jsonb_build_object(
        'reference', v_visit.reference,
        'starts_at', lower(v_visit.during),
        'mode', v_visit.mode,
        'client_name', v_visit.client_name,
        'service_name', (SELECT service.name FROM public.services AS service
                         WHERE service.id = v_visit.service_id),
        'price_minor', v_visit.price_minor,
        'currency_code', v_visit.currency_code
      ))
    FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
          WHERE role.role = 'admin') AS admin;
    RETURN v_visit.reference;
  END IF;

  SELECT seat.* INTO v_seat
  FROM public.workshop_payments AS payment
  JOIN public.workshop_registrations AS seat ON seat.id = payment.registration_id
  WHERE payment.payment_intent_id = p_payment_intent_id;
  IF NOT FOUND AND p_reference IS NOT NULL THEN
    SELECT * INTO v_seat FROM public.workshop_registrations WHERE reference = p_reference;
  END IF;
  IF v_seat.id IS NULL THEN
    RETURN NULL;
  END IF;
  UPDATE public.workshop_registrations
  SET payment_disputed_at = coalesce(payment_disputed_at, now()),
      payment_dispute_status = left(coalesce(p_status, CASE WHEN p_closed THEN 'closed' ELSE 'open' END), 40)
  WHERE id = v_seat.id;
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', NULL, v_notice, 'payment',
    v_money || jsonb_strip_nulls(jsonb_build_object(
      'reference', v_seat.reference,
      'starts_at', workshop.starts_at,
      'client_name', v_seat.client_name,
      'service_name', workshop.title,
      'price_minor', v_seat.price_minor,
      'currency_code', v_seat.currency_code
    ))
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  CROSS JOIN public.workshops AS workshop
  WHERE workshop.id = v_seat.workshop_id;
  RETURN v_seat.reference;
END;
$$;
