-- Warsztat · 6 (the workshop map): the centre helps a participant with no
-- e-mail about their seat, as Klient · 6 does for visits
-- (20261031150000_visit_links_and_bounces).
-- * Card 6: a link from an older e-mail keeps leading to the seat. An
--   e-mail sent again (or after a new date) no longer deletes the earlier
--   one's row, which holds its link; the row is set aside (superseded_at)
--   and a new one is claimed.
-- * Card 8: "Wyślij link ponownie": the e-mail of the seat's state, once
--   more, with a new link (not twice in five minutes; admins).
-- * Card 9: an e-mail that bounced shows by the participant until their
--   address changes.
-- * Card 10: an online workshop two days ahead with no meeting link: the
--   admins and the leaders hear of it once; the reminder waits for the
--   link.

-- ------------------------------------------------------------ cards 6 and 8

ALTER TABLE public.workshop_emails
  ADD COLUMN superseded_at timestamptz,
  ADD COLUMN bounced_at timestamptz,
  DROP CONSTRAINT workshop_emails_registration_id_kind_key;

CREATE UNIQUE INDEX workshop_emails_current_key
  ON public.workshop_emails (registration_id, kind)
  WHERE superseded_at IS NULL;

CREATE INDEX workshop_emails_message_idx
  ON public.workshop_emails (message_id)
  WHERE message_id IS NOT NULL;

-- (The body of 20261025170000_workshop_seat_lost_email, with only the
-- current e-mail of a kind counted, claimed or sent.)
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
    'reminder', 'cancelled', 'rescheduled', 'refunded', 'seat_lost'
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

-- (The body of 20261023090000_workshop_signup: the current e-mail only.)
CREATE OR REPLACE FUNCTION public.mark_workshop_email_sent(p_reference text, p_kind text, p_message_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.workshop_emails AS e
  SET sent_at = now(), message_id = left(p_message_id, 200)
  FROM public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.reference = p_reference AND e.kind = p_kind
    AND e.superseded_at IS NULL;
$$;

-- A failed send gives the claim back (its link token goes with it).
-- (The body of 20261023090000_workshop_signup: the current e-mail only.)
CREATE OR REPLACE FUNCTION public.release_workshop_email(p_reference text, p_kind text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  DELETE FROM public.workshop_emails AS e
  USING public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.reference = p_reference
    AND e.kind = p_kind AND e.sent_at IS NULL AND e.superseded_at IS NULL;
$$;

-- A new date: everyone signed up may cancel with a full refund, and hears
-- of it (the reminder goes again before the new date). (The body of
-- 20261023170000_workshop_after_signup; the earlier e-mails are set aside,
-- not deleted, so their links still lead to the seat.)
CREATE OR REPLACE FUNCTION private.workshop_rescheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.workshop_registrations AS r
  SET rescheduled_at = now(), refund_any_time = true
  WHERE r.workshop_id = NEW.id
    AND r.status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered');
  UPDATE public.workshop_emails AS e
  SET superseded_at = now()
  FROM public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.workshop_id = NEW.id
    AND e.kind IN ('rescheduled', 'reminder') AND e.superseded_at IS NULL
    AND r.status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered');
  RETURN NULL;
END;
$$;

-- Card 8: the e-mail of the seat's state may be claimed once more (the
-- site sends it, as centre_resend_visit_link): a confirmed seat's
-- confirmation, a reserved seat's link to pay, the waitlist's place, a
-- freed seat's offer. Admins; not twice in five minutes.
CREATE FUNCTION public.centre_resend_workshop_link(p_registration_id uuid)
RETURNS TABLE (reference text, kind text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_kind text;
BEGIN
  PERFORM private.require_workshop_admin();
  SELECT * INTO v_registration FROM public.workshop_registrations AS r
  WHERE r.id = p_registration_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such registration' USING HINT = 'not_found';
  END IF;
  v_kind := CASE
    WHEN v_registration.client_email IS NULL THEN NULL
    WHEN NOT EXISTS (
      SELECT 1 FROM public.workshops AS w
      WHERE w.id = v_registration.workshop_id AND w.status = 'published' AND w.ends_at > now()
    ) THEN NULL
    WHEN v_registration.status = 'confirmed' THEN 'confirmation'
    WHEN v_registration.status = 'awaiting_payment' AND v_registration.payment_due_at > now() THEN 'reserved'
    WHEN v_registration.status = 'waitlisted' THEN 'waitlisted'
    WHEN v_registration.status = 'offered' AND v_registration.offer_expires_at > now() THEN 'offered'
  END;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Nothing to send' USING HINT = 'nothing_to_send';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_emails AS e
    WHERE e.registration_id = v_registration.id AND e.kind = v_kind
      AND e.superseded_at IS NULL AND e.claimed_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'The link was sent a moment ago' USING HINT = 'recently_sent';
  END IF;
  UPDATE public.workshop_emails AS e
  SET superseded_at = now()
  WHERE e.registration_id = v_registration.id AND e.kind = v_kind
    AND e.superseded_at IS NULL;
  RETURN QUERY SELECT v_registration.reference, v_kind;
END;
$$;

REVOKE ALL ON FUNCTION public.centre_resend_workshop_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_resend_workshop_link(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------ card 9

ALTER TABLE public.workshop_registrations ADD COLUMN email_bounced_at timestamptz;
GRANT SELECT (email_bounced_at) ON public.workshop_registrations TO authenticated;

-- Resend says a message bounced; if it was a workshop's e-mail, its
-- participant is marked (once per message). The seat's reference, or null.
CREATE FUNCTION public.mark_workshop_email_bounced(p_message_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration_id uuid;
  v_reference text;
BEGIN
  UPDATE public.workshop_emails AS e
  SET bounced_at = now()
  WHERE e.message_id = p_message_id AND e.bounced_at IS NULL
  RETURNING e.registration_id INTO v_registration_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  UPDATE public.workshop_registrations AS r
  SET email_bounced_at = now()
  WHERE r.id = v_registration_id
  RETURNING r.reference INTO v_reference;
  RETURN v_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_workshop_email_bounced(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_workshop_email_bounced(text) TO service_role;

-- A new address (the seat passed on, the details corrected) has not
-- bounced.
CREATE FUNCTION private.workshop_email_changed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.email_bounced_at := NULL;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workshop_email_changed
  BEFORE UPDATE OF client_email ON public.workshop_registrations
  FOR EACH ROW
  WHEN (OLD.client_email IS DISTINCT FROM NEW.client_email)
  EXECUTE FUNCTION private.workshop_email_changed();

-- ------------------------------------------------------------ card 10

ALTER TABLE public.workshops ADD COLUMN link_reminded_at timestamptz;

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'booked', 'reserved', 'centre_booked', 'paid', 'cancelled',
    'rescheduled', 'refunded', 'profile_submitted', 'profile_approved',
    'profile_rejected', 'visit_to_close', 'unpaid_limit', 'disputed',
    'dispute_closed', 'workshop_signup', 'workshop_cancelled',
    'workshop_full', 'workshop_minimum', 'workshop_no_link'
  ]));

-- Whether an online workshop has its meeting link.
CREATE FUNCTION private.workshop_has_link(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshop_online_links AS link
    WHERE link.workshop_id = p_workshop_id AND nullif(btrim(link.meeting_url), '') IS NOT NULL
  );
$$;

-- An online workshop starting within two days, with people signed up and
-- no link: the admins and the leaders hear of it once (a day before the
-- reminder). How many.
CREATE FUNCTION public.remind_missing_workshop_links()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT w.id FROM public.workshops AS w
    WHERE w.status = 'published' AND w.modality = 'online'
      AND w.link_reminded_at IS NULL
      AND w.starts_at > now() AND w.starts_at - interval '48 hours' <= now()
      AND NOT private.workshop_has_link(w.id)
      AND EXISTS (
        SELECT 1 FROM public.workshop_registrations AS r
        WHERE r.workshop_id = w.id AND r.status = 'confirmed'
      )
  LOOP
    UPDATE public.workshops SET link_reminded_at = now() WHERE id = v_id;
    PERFORM private.notify_workshop(v_id, NULL, 'workshop_no_link', 'system');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.remind_missing_workshop_links() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remind_missing_workshop_links() TO service_role;

-- (The body of 20261025170000_workshop_seat_lost_email: an online
-- workshop's reminder waits for its link; only the current e-mail of a
-- kind counts as sent.)
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
