-- Workshops, PR 5 and 6 (docs/product/workshops-plan.md): after signing
-- up, and the participants in the portals.
--
-- The guest gives the seat up or passes it on from the registration’s
-- page. The e-mails that follow events (an offer from the waitlist, the
-- payment reminder, the reminder a day before, a cancellation, a new date,
-- a later refund) are listed for the scheduled job and claimed once each.
-- A new date lets everyone signed up cancel with a full refund at any
-- time. Admins and the workshop’s leaders hear of sign-ups,
-- cancellations, a full workshop and a minimum not reached in time.
--
-- In the portal the admin adds a participant (paid outside the site, or
-- with the link to pay), cancels one (with the refund chosen), writes to
-- everyone, marks who came (leaders too) and closes the workshop.

-- ------------------------------------------------------------ new columns

ALTER TABLE public.workshop_registrations
  ADD COLUMN rescheduled_at timestamptz,
  -- After a new date: a full refund whenever the seat is given up.
  ADD COLUMN refund_any_time boolean NOT NULL DEFAULT false,
  -- Paid to the centre directly (a transfer, cash): nothing to refund here.
  ADD COLUMN paid_outside boolean NOT NULL DEFAULT false;

GRANT SELECT (rescheduled_at, refund_any_time, paid_outside)
  ON public.workshop_registrations TO authenticated;

ALTER TABLE public.workshops ADD COLUMN minimum_reminded_at timestamptz;

ALTER TABLE public.workshop_emails DROP CONSTRAINT workshop_emails_kind_check;
ALTER TABLE public.workshop_emails ADD CONSTRAINT workshop_emails_kind_check CHECK (
  kind IN (
    'confirmation', 'reserved', 'waitlisted', 'offered', 'payment_reminder',
    'reminder', 'cancelled', 'rescheduled', 'refunded'
  )
);

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'booked', 'reserved', 'centre_booked', 'paid', 'cancelled',
    'rescheduled', 'refunded', 'profile_submitted', 'profile_approved',
    'profile_rejected', 'visit_to_close', 'unpaid_limit', 'disputed',
    'dispute_closed', 'workshop_signup', 'workshop_cancelled',
    'workshop_full', 'workshop_minimum'
  ]));

-- What the admin writes to everyone signed up (sent by the site).
CREATE TABLE public.workshop_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  recipients integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workshop_messages_workshop_idx ON public.workshop_messages (workshop_id, created_at DESC);

ALTER TABLE public.workshop_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_messages FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_messages FROM anon, authenticated;
GRANT SELECT ON public.workshop_messages TO authenticated;
CREATE POLICY "Admins and leaders can read the messages" ON public.workshop_messages
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role) OR private.leads_workshop(workshop_id));

-- ------------------------------------------------------------ notifications

-- Tells the admins and the workshop’s leaders (each in their portal).
CREATE OR REPLACE FUNCTION private.notify_workshop(
  p_workshop_id uuid, p_registration_id uuid, p_kind text, p_actor text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_details jsonb;
BEGIN
  SELECT jsonb_strip_nulls(jsonb_build_object(
      'workshop_id', w.id,
      'reference', r.reference,
      'starts_at', w.starts_at,
      'mode', w.modality,
      'client_name', r.client_name,
      'service_name', w.title,
      'price_minor', r.paid_minor,
      'currency_code', w.currency_code
    ))
  INTO v_details
  FROM public.workshops AS w
  LEFT JOIN public.workshop_registrations AS r ON r.id = p_registration_id
  WHERE w.id = p_workshop_id;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', NULL, p_kind, p_actor, v_details
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role WHERE role.role = 'admin') AS admin;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT DISTINCT specialist.user_id, 'specialist', NULL, p_kind, p_actor,
    v_details - 'price_minor'
  FROM public.specialists AS specialist
  WHERE specialist.user_id IS NOT NULL
    AND specialist.id IN (
      SELECT w.specialist_id FROM public.workshops AS w WHERE w.id = p_workshop_id
      UNION
      SELECT co.specialist_id FROM public.workshop_co_leaders AS co WHERE co.workshop_id = p_workshop_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION private.workshop_registration_noticed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
BEGIN
  IF NEW.status IN ('confirmed', 'awaiting_payment')
     AND OLD.status IN ('held', 'offered', 'waitlisted')
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

CREATE TRIGGER workshop_registration_noticed
  AFTER UPDATE OF status ON public.workshop_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.workshop_registration_noticed();

-- A new date: everyone signed up may cancel with a full refund, and hears
-- of it (the reminder goes again before the new date).
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
  DELETE FROM public.workshop_emails AS e
  USING public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.workshop_id = NEW.id
    AND e.kind IN ('rescheduled', 'reminder')
    AND r.status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered');
  RETURN NULL;
END;
$$;

CREATE TRIGGER workshop_rescheduled
  AFTER UPDATE OF starts_at, ends_at ON public.workshops
  FOR EACH ROW
  WHEN (
    NEW.status = 'published'
    AND (OLD.starts_at IS DISTINCT FROM NEW.starts_at OR OLD.ends_at IS DISTINCT FROM NEW.ends_at)
  )
  EXECUTE FUNCTION private.workshop_rescheduled();

-- ------------------------------------------------------------ the guest

-- cancel_workshop_registration, as before, with a full refund at any time
-- after a new date.
CREATE OR REPLACE FUNCTION public.cancel_workshop_registration(p_access_token text)
RETURNS TABLE (reference text, refund_minor integer, refund_when_replaced boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_workshop_id uuid;
  v_starts_at timestamptz;
  v_registration public.workshop_registrations%ROWTYPE;
  v_full boolean := false;
  v_later boolean := false;
BEGIN
  SELECT r.workshop_id INTO v_workshop_id FROM public.workshop_registrations AS r
  WHERE r.id = private.workshop_registration_id(p_access_token);
  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Nothing to cancel' USING HINT = 'already_cancelled';
  END IF;
  -- The workshop first, then the seat (the order every seat change keeps).
  SELECT w.starts_at INTO v_starts_at FROM public.workshops AS w
  WHERE w.id = v_workshop_id FOR UPDATE;
  PERFORM private.expire_workshop_registrations(v_workshop_id);
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Nothing to cancel' USING HINT = 'already_cancelled';
  END IF;
  IF now() >= v_starts_at THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;

  IF v_registration.status = 'confirmed' AND v_registration.paid_minor > v_registration.refunded_minor THEN
    v_full := v_registration.refund_any_time OR now() < v_starts_at - private.workshop_notice();
    v_later := NOT v_full;
  END IF;

  UPDATE public.workshop_registrations
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
      refund_due_minor = CASE WHEN v_full THEN paid_minor ELSE refunded_minor END,
      refund_when_replaced = v_later,
      hold_expires_at = NULL, offer_expires_at = NULL
  WHERE id = v_registration.id;
  RETURN QUERY SELECT v_registration.reference,
    CASE WHEN v_full THEN v_registration.paid_minor - v_registration.refunded_minor ELSE 0 END,
    v_later;
END;
$$;

-- transfer_workshop_seat, as before; the new participant gets the
-- seat’s e-mails again.
CREATE OR REPLACE FUNCTION public.transfer_workshop_seat(
  p_access_token text, p_name text, p_email text, p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR v_registration.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Only a booked seat can be passed on' USING HINT = 'not_transferable';
  END IF;
  IF now() >= (SELECT starts_at FROM public.workshops WHERE id = v_registration.workshop_id) THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);
  BEGIN
    UPDATE public.workshop_registrations
    SET client_name = nullif(btrim(p_name), ''),
        client_email = lower(nullif(btrim(p_email), '')),
        client_phone = nullif(btrim(p_phone), ''),
        client_notes = NULL
    WHERE id = v_registration.id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  DELETE FROM public.workshop_emails
  WHERE registration_id = v_registration.id
    AND kind IN ('confirmation', 'reserved', 'reminder', 'payment_reminder', 'rescheduled');
END;
$$;

-- get_workshop_registration, as before, with what the page now offers.
DROP FUNCTION public.get_workshop_registration(text);
CREATE FUNCTION public.get_workshop_registration(p_access_token text)
RETURNS TABLE (
  reference text,
  status public.workshop_registration_status,
  workshop_slug text,
  workshop_title text,
  workshop_status public.workshop_status,
  workshop_confirmed boolean,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  room_name text,
  price_minor integer,
  currency_code text,
  paid_minor integer,
  refund_due_minor integer,
  refunded_minor integer,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  details_saved boolean,
  hold_expires_at timestamptz,
  payment_due_at timestamptz,
  offer_expires_at timestamptz,
  waitlist_position integer,
  full_refund_until timestamptz,
  can_pay_later boolean,
  cancelled_by text,
  meeting_url text,
  list_price_minor integer,
  discount_minor integer,
  discount_code text,
  refund_any_time boolean,
  refund_when_replaced boolean,
  workshop_cancel_reason text,
  paid_outside boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.reference,
    CASE
      WHEN r.status = 'held' AND r.hold_expires_at <= now() THEN 'expired'
      WHEN r.status = 'offered' AND r.offer_expires_at <= now() THEN 'expired'
      WHEN r.status = 'awaiting_payment' AND r.payment_due_at <= now() THEN 'cancelled'
      ELSE r.status
    END::public.workshop_registration_status,
    w.slug, w.title, w.status,
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.modality, w.starts_at, w.ends_at,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    room.name,
    r.price_minor, r.currency_code, r.paid_minor, r.refund_due_minor, r.refunded_minor,
    r.client_name, r.client_email, r.client_phone, r.client_notes,
    r.client_email IS NOT NULL AND (r.terms_accepted_at IS NOT NULL OR r.booked_by = 'centre'),
    r.hold_expires_at, r.payment_due_at, r.offer_expires_at,
    CASE WHEN r.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = r.workshop_id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (r.waitlisted_at, r.created_at)
    ) END,
    w.starts_at - private.workshop_notice(),
    r.price_minor > 0 AND w.starts_at - private.workshop_notice() > now(),
    r.cancelled_by,
    CASE WHEN r.status = 'confirmed' AND w.status = 'published' THEN link.meeting_url END,
    r.list_price_minor, r.discount_minor, dc.code,
    r.refund_any_time, r.refund_when_replaced, w.cancel_reason, r.paid_outside
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_online_links AS link ON link.workshop_id = w.id
  LEFT JOIN public.discount_codes AS dc ON dc.id = r.discount_code_id
  WHERE r.id = private.workshop_registration_id(p_access_token);
$$;

-- ------------------------------------------------------------ e-mails

-- claim_workshop_email, as before, for every kind, with what each says.
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
  paid_outside boolean
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
    'reminder', 'cancelled', 'rescheduled', 'refunded'
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
    ELSE v_registration.status = 'cancelled' AND v_registration.refunded_minor > 0
  END;
  IF NOT v_due THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_emails AS e
    WHERE e.registration_id = v_registration.id AND e.kind = p_kind
      AND (e.sent_at IS NOT NULL OR e.claimed_at > now() - interval '10 minutes')
  ) THEN
    RETURN;
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  INSERT INTO public.workshop_emails (registration_id, kind, token_hash)
  VALUES (v_registration.id, p_kind, extensions.digest(v_token, 'sha256'))
  ON CONFLICT (registration_id, kind) DO UPDATE
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
    v_registration.refunded_minor,
    v_registration.refund_when_replaced,
    CASE WHEN v_registration.status = 'confirmed' AND w.status = 'published'
      THEN (SELECT link.meeting_url FROM public.workshop_online_links AS link WHERE link.workshop_id = w.id) END,
    v_registration.paid_outside
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = v_registration.workshop_id;
END;
$$;

-- The e-mails events call for, not yet sent (the scheduled job sends them).
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
  )
  SELECT due.reference, due.kind FROM due
  JOIN public.workshop_registrations AS r ON r.id = due.id
  WHERE r.client_email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.workshop_emails AS e
      WHERE e.registration_id = due.id AND e.kind = due.kind
    );
$$;

-- Registrations owed money not given back yet (a late cancellation the
-- waitlist replaced, a refund that failed): the job gives it back.
CREATE OR REPLACE FUNCTION public.list_owed_workshop_refunds()
RETURNS TABLE (registration_id uuid, reference text, owed_minor integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.id, r.reference, r.refund_due_minor - r.refunded_minor
  FROM public.workshop_registrations AS r
  WHERE r.status = 'cancelled' AND r.refund_due_minor > r.refunded_minor
    AND NOT r.paid_outside;
$$;

-- The admins and leaders hear of a minimum not reached three days before
-- the payments are due (once); the admin decides.
CREATE OR REPLACE FUNCTION public.remind_workshop_minimums()
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
    WHERE w.status = 'published' AND w.min_participants IS NOT NULL
      AND w.confirmed_at IS NULL AND w.minimum_reminded_at IS NULL
      AND w.starts_at > now()
      AND w.starts_at - private.workshop_notice() - interval '3 days' <= now()
      AND (
        SELECT count(*) FROM public.workshop_registrations AS r
        WHERE r.workshop_id = w.id AND r.status = 'confirmed'
      ) < w.min_participants
  LOOP
    UPDATE public.workshops SET minimum_reminded_at = now() WHERE id = v_id;
    PERFORM private.notify_workshop(v_id, NULL, 'workshop_minimum', 'system');
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------ the portal

-- The admin adds someone (a call, a transfer): paid outside the site (or
-- free) is confirmed; otherwise the seat waits for the payment, the link
-- going by e-mail. Refusals: full, already_registered, invalid_details.
CREATE OR REPLACE FUNCTION public.centre_add_workshop_participant(
  p_workshop_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_paid_outside boolean
)
RETURNS TABLE (reference text, status public.workshop_registration_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_workshop public.workshops%ROWTYPE;
  v_reference text;
  v_status public.workshop_registration_status;
  v_due timestamptz;
BEGIN
  PERFORM private.require_workshop_admin();
  SELECT * INTO v_workshop FROM public.workshops WHERE id = p_workshop_id FOR UPDATE;
  IF NOT FOUND OR v_workshop.status <> 'published' OR v_workshop.starts_at <= now() THEN
    RAISE EXCEPTION 'Not open' USING HINT = 'registration_closed';
  END IF;
  PERFORM private.expire_workshop_registrations(p_workshop_id);
  IF private.workshop_seats_taken(p_workshop_id) >= v_workshop.capacity THEN
    RAISE EXCEPTION 'The workshop is full' USING HINT = 'full';
  END IF;
  PERFORM private.require_new_participant(p_workshop_id, p_email, NULL);

  IF coalesce(p_paid_outside, false) OR v_workshop.price_minor = 0 THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'awaiting_payment';
    v_due := greatest(
      v_workshop.starts_at - private.workshop_notice(),
      least(now() + interval '2 days', v_workshop.starts_at)
    );
  END IF;
  v_reference := 'W' || private.next_booking_reference(
    now(), (SELECT timezone FROM public.center_settings WHERE id = 1)
  );
  BEGIN
    INSERT INTO public.workshop_registrations (
      workshop_id, reference, status, booked_by, access_token_hash,
      price_minor, currency_code, paid_outside, payment_due_at, confirmed_at,
      client_name, client_email, client_phone, client_notes
    )
    VALUES (
      p_workshop_id, v_reference, v_status, 'centre',
      extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
      v_workshop.price_minor, v_workshop.currency_code,
      coalesce(p_paid_outside, false) AND v_workshop.price_minor > 0,
      v_due, CASE WHEN v_status = 'confirmed' THEN now() END,
      nullif(btrim(p_name), ''), lower(nullif(btrim(p_email), '')),
      nullif(btrim(p_phone), ''), nullif(btrim(p_notes), '')
    );
  EXCEPTION
    WHEN check_violation OR not_null_violation THEN
      RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Already registered' USING HINT = 'already_registered';
  END;
  RETURN QUERY SELECT v_reference, v_status;
END;
$$;

-- The admin cancels one participant, giving back what they chose (at most
-- what was paid through the site); the site moves the money.
CREATE OR REPLACE FUNCTION public.centre_cancel_workshop_participant(
  p_registration_id uuid, p_refund_minor integer
)
RETURNS TABLE (reference text, refund_minor integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_refund integer := greatest(coalesce(p_refund_minor, 0), 0);
BEGIN
  PERFORM private.require_workshop_admin();
  PERFORM 1 FROM public.workshops AS w
  JOIN public.workshop_registrations AS r ON r.workshop_id = w.id
  WHERE r.id = p_registration_id
  FOR UPDATE OF w;
  SELECT * INTO v_registration FROM public.workshop_registrations
  WHERE id = p_registration_id FOR UPDATE;
  IF NOT FOUND OR v_registration.status NOT IN ('held', 'awaiting_payment', 'confirmed', 'waitlisted', 'offered') THEN
    RAISE EXCEPTION 'Nothing to cancel' USING HINT = 'already_cancelled';
  END IF;
  IF v_registration.paid_outside THEN
    v_refund := 0;
  END IF;
  IF v_refund > v_registration.paid_minor - v_registration.refunded_minor THEN
    RAISE EXCEPTION 'More than was paid' USING HINT = 'refund_too_high';
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre',
      refund_due_minor = refunded_minor + v_refund, refund_when_replaced = false,
      hold_expires_at = NULL, offer_expires_at = NULL
  WHERE id = p_registration_id;
  RETURN QUERY SELECT v_registration.reference, v_refund;
END;
$$;

-- Who came: the admin or the workshop’s leaders, once it has begun.
CREATE OR REPLACE FUNCTION public.set_workshop_attendance(p_registration_id uuid, p_attended boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop_id uuid;
BEGIN
  SELECT r.workshop_id INTO v_workshop_id FROM public.workshop_registrations AS r
  WHERE r.id = p_registration_id AND r.status = 'confirmed';
  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Not a confirmed participant' USING HINT = 'not_found';
  END IF;
  IF NOT (public.has_role('admin'::public.app_role) OR private.leads_workshop(v_workshop_id)) THEN
    RAISE EXCEPTION 'Only admins and the leaders mark who came' USING ERRCODE = '42501';
  END IF;
  IF (SELECT starts_at FROM public.workshops WHERE id = v_workshop_id) > now() THEN
    RAISE EXCEPTION 'The workshop has not begun' USING HINT = 'not_started';
  END IF;
  UPDATE public.workshop_registrations SET attended = p_attended WHERE id = p_registration_id;
END;
$$;

-- Closes a workshop that has ended.
CREATE OR REPLACE FUNCTION public.complete_workshop(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_workshop_admin();
  UPDATE public.workshops SET status = 'completed'
  WHERE id = p_id AND status = 'published' AND ends_at <= now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a workshop that has ended is closed' USING HINT = 'not_ended';
  END IF;
END;
$$;

-- The admin writes to everyone signed up (confirmed or awaiting the
-- payment): kept, with whom the site sends it to.
CREATE OR REPLACE FUNCTION public.record_workshop_message(
  p_workshop_id uuid, p_subject text, p_body text
)
RETURNS TABLE (message_id uuid, reference text, client_name text, client_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_id uuid;
BEGIN
  PERFORM private.require_workshop_admin();
  BEGIN
    INSERT INTO public.workshop_messages (workshop_id, subject, body, created_by, recipients)
    VALUES (
      p_workshop_id, btrim(p_subject), btrim(p_body), auth.uid(),
      (SELECT count(*) FROM public.workshop_registrations AS r
        WHERE r.workshop_id = p_workshop_id AND r.status IN ('confirmed', 'awaiting_payment')
          AND r.client_email IS NOT NULL)
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'Write a subject and a message' USING HINT = 'invalid_message';
  END;
  RETURN QUERY
  SELECT v_id, r.reference, r.client_name, r.client_email
  FROM public.workshop_registrations AS r
  WHERE r.workshop_id = p_workshop_id AND r.status IN ('confirmed', 'awaiting_payment')
    AND r.client_email IS NOT NULL
  ORDER BY r.created_at;
END;
$$;

-- ------------------------------------------------------------ access

REVOKE ALL ON FUNCTION private.notify_workshop(uuid, uuid, text, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.get_workshop_registration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_workshop_email(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_due_workshop_emails() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_owed_workshop_refunds() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remind_workshop_minimums() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workshop_registration(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_workshop_email(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_due_workshop_emails() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_owed_workshop_refunds() TO service_role;
GRANT EXECUTE ON FUNCTION public.remind_workshop_minimums() TO service_role;

REVOKE ALL ON FUNCTION public.centre_add_workshop_participant(uuid, text, text, text, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.centre_cancel_workshop_participant(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_workshop_attendance(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_workshop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_workshop_message(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_add_workshop_participant(uuid, text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.centre_cancel_workshop_participant(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_workshop_attendance(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_workshop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_workshop_message(uuid, text, text) TO authenticated;
