-- Workshops, PR 3 and 4 (docs/product/workshops-plan.md): what the site
-- shows and how a guest pays. A discount code is now for consultations,
-- workshops (all or one) or everything; codes so far stay consultations.
-- A registration takes a code like a visit does, is paid through a Stripe
-- Checkout Session of its own (workshop_payments) and gets its e-mails
-- once each (workshop_emails), each with its own link to the registration.

-- ------------------------------------------------------------ codes: what for

ALTER TABLE public.discount_codes
  ADD COLUMN scope text NOT NULL DEFAULT 'consultations'
    CHECK (scope IN ('all', 'consultations', 'workshops')),
  ADD COLUMN workshop_id uuid REFERENCES public.workshops (id) ON DELETE RESTRICT,
  ADD CONSTRAINT discount_codes_workshop_scope CHECK (workshop_id IS NULL OR scope = 'workshops');

-- A code that works today for this (a visit, or this workshop), or the
-- refusal: code_unknown, code_not_started, code_expired, code_not_here.
CREATE OR REPLACE FUNCTION private.usable_discount_code(
  p_code text, p_workshop_id uuid
)
RETURNS public.discount_codes
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
DECLARE
  v_code public.discount_codes%ROWTYPE;
  v_today date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
BEGIN
  SELECT * INTO v_code FROM public.discount_codes AS dc
  WHERE dc.code = upper(btrim(p_code));
  IF NOT FOUND OR NOT v_code.active THEN
    RAISE EXCEPTION 'Unknown code' USING HINT = 'code_unknown';
  END IF;
  IF v_code.starts_on IS NOT NULL AND v_today < v_code.starts_on THEN
    RAISE EXCEPTION 'Code not started' USING HINT = 'code_not_started';
  END IF;
  IF v_code.ends_on IS NOT NULL AND v_today > v_code.ends_on THEN
    RAISE EXCEPTION 'Code expired' USING HINT = 'code_expired';
  END IF;
  IF (p_workshop_id IS NULL AND v_code.scope = 'workshops')
     OR (p_workshop_id IS NOT NULL AND v_code.scope = 'consultations')
     OR (v_code.workshop_id IS NOT NULL AND v_code.workshop_id IS DISTINCT FROM p_workshop_id)
  THEN
    RAISE EXCEPTION 'The code is not for this' USING HINT = 'code_not_here';
  END IF;
  RETURN v_code;
END;
$$;

-- apply_discount_code, as before, but only with a code for consultations.
CREATE OR REPLACE FUNCTION public.apply_discount_code(
  p_access_token text,
  p_code text
)
RETURNS TABLE (
  code text,
  list_price_minor integer,
  discount_minor integer,
  price_minor integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_code public.discount_codes%ROWTYPE;
  v_list integer;
  v_discount integer;
BEGIN
  v_visit := private.held_visit(p_access_token);
  v_code := private.usable_discount_code(p_code, NULL);

  v_list := coalesce(v_visit.list_price_minor, v_visit.price_minor);
  v_discount := private.discount_on(v_code.kind, v_code.value, v_list);

  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments AS visit SET
    list_price_minor = v_list,
    discount_minor = v_discount,
    price_minor = v_list - v_discount,
    discount_code_id = v_code.id
  WHERE visit.id = v_visit.id;

  RETURN QUERY SELECT v_code.code, v_list, v_discount, v_list - v_discount;
END;
$$;

DROP FUNCTION public.list_discount_codes();
CREATE FUNCTION public.list_discount_codes()
RETURNS TABLE (
  id uuid,
  code text,
  kind text,
  value integer,
  starts_on date,
  ends_on date,
  active boolean,
  note text,
  created_at timestamptz,
  used_count bigint,
  discount_total_minor bigint,
  scope text,
  workshop_id uuid,
  workshop_title text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT dc.id, dc.code, dc.kind, dc.value, dc.starts_on,
    dc.ends_on, dc.active, dc.note, dc.created_at,
    (SELECT count(*) FROM public.appointments AS visit
      WHERE visit.discount_code_id = dc.id AND visit.status IN ('awaiting_payment', 'confirmed'))
    + (SELECT count(*) FROM public.workshop_registrations AS r
      WHERE r.discount_code_id = dc.id AND r.status IN ('awaiting_payment', 'confirmed')),
    coalesce((SELECT sum(visit.discount_minor) FROM public.appointments AS visit
      WHERE visit.discount_code_id = dc.id AND visit.status = 'confirmed'), 0)
    + coalesce((SELECT sum(r.discount_minor) FROM public.workshop_registrations AS r
      WHERE r.discount_code_id = dc.id AND r.status = 'confirmed'), 0),
    dc.scope, dc.workshop_id, w.title
  FROM public.discount_codes AS dc
  LEFT JOIN public.workshops AS w ON w.id = dc.workshop_id
  ORDER BY dc.created_at DESC;
END;
$$;

DROP FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text);
-- Adds a code (p_id null) or changes one; the code is kept in capitals.
CREATE FUNCTION public.save_discount_code(
  p_id uuid,
  p_code text,
  p_kind text,
  p_value integer,
  p_starts_on date,
  p_ends_on date,
  p_active boolean,
  p_note text,
  p_scope text,
  p_workshop_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM private.require_admin();
  IF p_id IS NULL THEN
    INSERT INTO public.discount_codes (code, kind, value, starts_on, ends_on, active, note, scope, workshop_id)
    VALUES (upper(btrim(p_code)), p_kind, p_value, p_starts_on, p_ends_on, p_active,
      coalesce(p_note, ''), p_scope, p_workshop_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.discount_codes SET
      code = upper(btrim(p_code)), kind = p_kind, value = p_value,
      starts_on = p_starts_on, ends_on = p_ends_on, active = p_active,
      note = coalesce(p_note, ''), scope = p_scope, workshop_id = p_workshop_id,
      updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Discount code not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- Deletes a code nobody used (a used one is switched off instead).
CREATE OR REPLACE FUNCTION public.delete_discount_code(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF EXISTS (SELECT 1 FROM public.appointments WHERE discount_code_id = p_id)
     OR EXISTS (SELECT 1 FROM public.workshop_registrations WHERE discount_code_id = p_id)
  THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;
  DELETE FROM public.discount_codes WHERE id = p_id;
END;
$$;

-- ------------------------------------------------------------ registrations

ALTER TABLE public.workshop_registrations
  ADD COLUMN list_price_minor integer,
  ADD COLUMN discount_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes (id) ON DELETE RESTRICT,
  ADD CONSTRAINT workshop_registrations_discount_valid CHECK (
    (discount_code_id IS NULL AND list_price_minor IS NULL AND discount_minor = 0)
    OR (
      discount_code_id IS NOT NULL
      AND list_price_minor IS NOT NULL
      AND discount_minor BETWEEN 0 AND list_price_minor
      AND price_minor = list_price_minor - discount_minor
    )
  );

CREATE INDEX workshop_registrations_discount_code_idx
  ON public.workshop_registrations (discount_code_id) WHERE discount_code_id IS NOT NULL;

GRANT SELECT (list_price_minor, discount_minor, discount_code_id)
  ON public.workshop_registrations TO authenticated;

-- A registration’s payments through Stripe.
CREATE TABLE public.workshop_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.workshop_registrations (id) ON DELETE RESTRICT,
  checkout_session_id text NOT NULL UNIQUE CHECK (checkout_session_id ~ '^cs_'),
  payment_intent_id text CHECK (payment_intent_id IS NULL OR payment_intent_id ~ '^pi_'),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  status public.payment_status NOT NULL DEFAULT 'pending',
  refunded_minor integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_payments_refund_valid CHECK (refunded_minor BETWEEN 0 AND amount_minor)
);

CREATE INDEX workshop_payments_registration_idx ON public.workshop_payments (registration_id);
CREATE INDEX workshop_payments_intent_idx
  ON public.workshop_payments (payment_intent_id) WHERE payment_intent_id IS NOT NULL;

CREATE TRIGGER set_workshop_payments_updated_at
  BEFORE UPDATE ON public.workshop_payments
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.workshop_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_payments FROM anon, authenticated;
GRANT SELECT ON public.workshop_payments TO authenticated;
CREATE POLICY "Admins can read workshop payments" ON public.workshop_payments
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));

-- A registration’s e-mails, each sent once, each with its own link token.
CREATE TABLE public.workshop_emails (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES public.workshop_registrations (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('confirmation', 'reserved', 'waitlisted')),
  token_hash bytea NOT NULL UNIQUE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  message_id text CHECK (message_id IS NULL OR char_length(message_id) <= 200),
  UNIQUE (registration_id, kind)
);

ALTER TABLE public.workshop_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_emails FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_emails FROM anon, authenticated;

-- The registration’s id for a guest’s token: the one from their hold, or
-- one an e-mail carried. No lock.
CREATE OR REPLACE FUNCTION private.workshop_registration_id(p_access_token text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  WITH token AS (
    SELECT extensions.digest(coalesce(p_access_token, ''), 'sha256') AS hash
  )
  SELECT coalesce(
    (SELECT r.id FROM public.workshop_registrations AS r, token
      WHERE r.access_token_hash = token.hash),
    (SELECT e.registration_id FROM public.workshop_emails AS e, token
      WHERE e.token_hash = token.hash)
  );
$$;

-- The registration row for a guest’s token (either kind), locked.
CREATE OR REPLACE FUNCTION private.workshop_registration_by_token(p_access_token text)
RETURNS public.workshop_registrations
LANGUAGE sql
SET search_path TO ''
AS $$
  SELECT r.* FROM public.workshop_registrations AS r
  WHERE r.id = private.workshop_registration_id(p_access_token)
  FOR UPDATE;
$$;

-- get_workshop_registration, as before, by either token, with the code.
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
  discount_code text
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
    r.client_email IS NOT NULL AND r.terms_accepted_at IS NOT NULL,
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
    r.list_price_minor, r.discount_minor, dc.code
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_online_links AS link ON link.workshop_id = w.id
  LEFT JOIN public.discount_codes AS dc ON dc.id = r.discount_code_id
  WHERE r.id = private.workshop_registration_id(p_access_token);
$$;

-- cancel_workshop_registration, as before, by either token.
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
    v_full := now() < v_starts_at - private.workshop_notice();
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

-- A seat that can still be paid for: held or offered in time, or awaiting
-- payment before its due time; with the participant’s details.
CREATE OR REPLACE FUNCTION private.payable_workshop_seat(p_access_token text)
RETURNS public.workshop_registrations
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR NOT (
    (v_registration.status = 'held' AND v_registration.hold_expires_at > now())
    OR (v_registration.status = 'offered' AND v_registration.offer_expires_at > now())
    OR (v_registration.status = 'awaiting_payment' AND v_registration.payment_due_at > now())
  ) THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_registration.client_email IS NULL OR v_registration.terms_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The participant''s details come first' USING HINT = 'details_required';
  END IF;
  RETURN v_registration;
END;
$$;

-- ------------------------------------------------------------ the code

CREATE OR REPLACE FUNCTION public.apply_workshop_discount(p_access_token text, p_code text)
RETURNS TABLE (code text, list_price_minor integer, discount_minor integer, price_minor integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_code public.discount_codes%ROWTYPE;
  v_list integer;
  v_discount integer;
BEGIN
  v_registration := private.payable_workshop_seat(p_access_token);
  v_code := private.usable_discount_code(p_code, v_registration.workshop_id);
  v_list := coalesce(v_registration.list_price_minor, v_registration.price_minor);
  v_discount := private.discount_on(v_code.kind, v_code.value, v_list);

  UPDATE public.workshop_payments SET status = 'expired'
  WHERE registration_id = v_registration.id AND status = 'pending';
  UPDATE public.workshop_registrations AS r SET
    list_price_minor = v_list,
    discount_minor = v_discount,
    price_minor = v_list - v_discount,
    discount_code_id = v_code.id
  WHERE r.id = v_registration.id;

  RETURN QUERY SELECT v_code.code, v_list, v_discount, v_list - v_discount;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_workshop_discount(p_access_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.payable_workshop_seat(p_access_token);
  IF v_registration.discount_code_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.workshop_payments SET status = 'expired'
  WHERE registration_id = v_registration.id AND status = 'pending';
  UPDATE public.workshop_registrations AS r SET
    price_minor = v_registration.list_price_minor,
    list_price_minor = NULL,
    discount_minor = 0,
    discount_code_id = NULL
  WHERE r.id = v_registration.id;
END;
$$;

-- ------------------------------------------------------------ paying

-- The Stripe session started for the seat (amount checked against the
-- seat’s price); the earlier pending one stops counting. While the guest
-- pays, the hold or offer stays theirs (never beyond a day).
CREATE OR REPLACE FUNCTION public.attach_workshop_checkout(
  p_access_token text,
  p_session_id text,
  p_expires_at timestamptz,
  p_amount_minor integer,
  p_currency_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_until timestamptz := least(p_expires_at, now() + interval '1 day');
BEGIN
  v_registration := private.payable_workshop_seat(p_access_token);
  IF v_registration.price_minor = 0 THEN
    RAISE EXCEPTION 'A free seat is confirmed, not paid' USING HINT = 'free';
  END IF;
  IF p_amount_minor IS DISTINCT FROM v_registration.price_minor
     OR upper(p_currency_code) IS DISTINCT FROM v_registration.currency_code THEN
    RAISE EXCEPTION 'The amount is not the seat''s' USING HINT = 'amount_mismatch';
  END IF;

  UPDATE public.workshop_payments SET status = 'expired'
  WHERE registration_id = v_registration.id AND status = 'pending';
  INSERT INTO public.workshop_payments (registration_id, checkout_session_id, amount_minor, currency_code)
  VALUES (v_registration.id, p_session_id, p_amount_minor, v_registration.currency_code);

  UPDATE public.workshop_registrations
  SET hold_expires_at = CASE WHEN status = 'held' THEN greatest(hold_expires_at, v_until) ELSE hold_expires_at END,
      offer_expires_at = CASE WHEN status = 'offered' THEN greatest(offer_expires_at, v_until) ELSE offer_expires_at END
  WHERE id = v_registration.id;
END;
$$;

-- The open Stripe session for the seat, if one was started.
CREATE OR REPLACE FUNCTION public.pending_workshop_checkout(p_access_token text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT p.checkout_session_id FROM public.workshop_payments AS p
  WHERE p.registration_id = private.workshop_registration_id(p_access_token)
    AND p.status = 'pending'
  ORDER BY p.created_at DESC
  LIMIT 1;
$$;

-- A completed session: the seat is confirmed (paid). A seat whose hold
-- ran out is still confirmed while a seat is free; otherwise ’seat_lost’
-- (the site refunds it). ’pending’ while a slow method has not paid yet.
CREATE OR REPLACE FUNCTION public.fulfill_workshop_checkout(
  p_session_id text, p_paid boolean, p_payment_intent_id text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payment public.workshop_payments%ROWTYPE;
  v_registration public.workshop_registrations%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_live boolean;
BEGIN
  SELECT * INTO v_payment FROM public.workshop_payments
  WHERE checkout_session_id = p_session_id;
  IF NOT FOUND THEN
    RETURN 'unknown_session';
  END IF;
  -- The workshop first, then the seat (the order every seat change keeps).
  SELECT w.* INTO v_workshop FROM public.workshops AS w
  JOIN public.workshop_registrations AS r ON r.workshop_id = w.id
  WHERE r.id = v_payment.registration_id
  FOR UPDATE OF w;
  SELECT * INTO v_registration FROM public.workshop_registrations
  WHERE id = v_payment.registration_id FOR UPDATE;
  SELECT * INTO v_payment FROM public.workshop_payments
  WHERE id = v_payment.id FOR UPDATE;

  IF p_paid THEN
    UPDATE public.workshop_payments
    SET status = CASE WHEN status IN ('refunded', 'partially_refunded') THEN status ELSE 'succeeded' END,
        payment_intent_id = coalesce(p_payment_intent_id, payment_intent_id)
    WHERE id = v_payment.id;
  END IF;
  IF v_registration.status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;
  IF NOT p_paid THEN
    RETURN 'pending';
  END IF;

  v_live := private.workshop_seat_taken(
    v_registration.status, v_registration.hold_expires_at,
    v_registration.payment_due_at, v_registration.offer_expires_at
  );
  IF NOT v_live AND NOT (
    (v_registration.status IN ('held', 'offered', 'awaiting_payment', 'expired')
      OR (v_registration.status = 'cancelled' AND v_registration.cancelled_by = 'system'))
    AND v_workshop.status = 'published'
    AND v_workshop.starts_at > now()
    AND private.workshop_seats_taken(v_workshop.id) < v_workshop.capacity
  ) THEN
    RETURN 'seat_lost';
  END IF;

  UPDATE public.workshop_registrations
  SET status = 'confirmed', confirmed_at = now(),
      paid_minor = paid_minor + v_payment.amount_minor,
      hold_expires_at = NULL, offer_expires_at = NULL, payment_due_at = NULL,
      cancelled_at = NULL, cancelled_by = NULL
  WHERE id = v_registration.id;
  RETURN 'confirmed';
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_workshop_checkout(p_session_id text, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF p_reason NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION 'Unknown reason %', p_reason USING ERRCODE = 'invalid_parameter_value';
  END IF;
  UPDATE public.workshop_payments
  SET status = p_reason::public.payment_status
  WHERE checkout_session_id = p_session_id AND status = 'pending';
END;
$$;

-- Stripe’s refunded total for a payment; the registration’s refunded sum
-- follows (never above what it paid).
CREATE OR REPLACE FUNCTION public.record_workshop_refund(
  p_payment_intent_id text, p_refunded_minor integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration_id uuid;
BEGIN
  UPDATE public.workshop_payments
  SET refunded_minor = least(p_refunded_minor, amount_minor),
      status = CASE
        WHEN p_refunded_minor >= amount_minor THEN 'refunded'::public.payment_status
        ELSE 'partially_refunded'::public.payment_status
      END
  WHERE payment_intent_id = p_payment_intent_id
  RETURNING registration_id INTO v_registration_id;
  IF v_registration_id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.workshop_registrations AS r
  SET refunded_minor = least(r.paid_minor, (
    SELECT coalesce(sum(p.refunded_minor), 0)::integer FROM public.workshop_payments AS p
    WHERE p.registration_id = r.id
  ))
  WHERE r.id = v_registration_id;
  RETURN true;
END;
$$;

-- ------------------------------------------------------------ e-mails

-- Claims a registration’s e-mail of this kind if nobody sent it (and no
-- send is under way): what it says, and the token of its link.
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
  waitlist_position integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_token text;
  -- The registration’s state the e-mail is about.
  v_status text := CASE p_kind
    WHEN 'confirmation' THEN 'confirmed'
    WHEN 'reserved' THEN 'awaiting_payment'
    ELSE 'waitlisted' END;
BEGIN
  IF p_kind NOT IN ('confirmation', 'reserved', 'waitlisted') THEN
    RAISE EXCEPTION 'Unknown e-mail %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_registration FROM public.workshop_registrations AS r
  WHERE r.reference = p_reference FOR UPDATE;
  IF NOT FOUND OR v_registration.client_email IS NULL
     OR v_registration.status::text <> v_status
  THEN
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
    ) END
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = v_registration.workshop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_workshop_email_sent(p_reference text, p_kind text, p_message_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.workshop_emails AS e
  SET sent_at = now(), message_id = left(p_message_id, 200)
  FROM public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.reference = p_reference AND e.kind = p_kind;
$$;

-- A failed send gives the claim back (its link token goes with it).
CREATE OR REPLACE FUNCTION public.release_workshop_email(p_reference text, p_kind text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  DELETE FROM public.workshop_emails AS e
  USING public.workshop_registrations AS r
  WHERE r.id = e.registration_id AND r.reference = p_reference
    AND e.kind = p_kind AND e.sent_at IS NULL;
$$;

-- ------------------------------------------------------------ the site

-- Every public workshop with what its card and page show: the place, the
-- leaders with a public profile, the seats. Few, so the pages filter.
CREATE OR REPLACE FUNCTION public.list_public_workshops()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  short_description text,
  body jsonb,
  audience text,
  agenda text,
  cover_image_path text,
  cover_alt text,
  seo_title text,
  seo_description text,
  modality public.workshop_modality,
  status public.workshop_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_minor integer,
  currency_code text,
  capacity integer,
  min_participants integer,
  location_name text,
  location_address text,
  location_city text,
  room_name text,
  leaders jsonb,
  seats_left integer,
  registration_open boolean,
  confirmed boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT w.id, w.slug, w.title, w.short_description, w.body, w.audience, w.agenda,
    w.cover_image_path, w.cover_alt, w.seo_title, w.seo_description,
    w.modality, w.status, w.starts_at, w.ends_at, w.price_minor, w.currency_code,
    w.capacity, w.min_participants,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    location.city,
    room.name,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'slug', specialist.public_slug,
          'name', profile.display_name,
          'title', specialist.professional_title,
          'photoPath', profile.profile_photo_url
        ) ORDER BY leader.main DESC, profile.display_name)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader
      JOIN public.specialists AS specialist ON specialist.id = leader.id
      JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
      WHERE specialist.publicly_visible AND private.specialist_has_published_profile(specialist.id)
    ), '[]'::jsonb),
    greatest(w.capacity - private.workshop_seats_taken(w.id), 0),
    w.status = 'published' AND w.registration_enabled
      AND now() < private.workshop_closes_at(w.registration_closes_at, w.starts_at),
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.updated_at
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.status <> 'draft'
  ORDER BY w.starts_at;
$$;

-- ------------------------------------------------------------ access

REVOKE ALL ON FUNCTION private.usable_discount_code(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_registration_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.payable_workshop_seat(text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.list_discount_codes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_discount_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_workshop_registration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_workshop_discount(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_workshop_discount(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_workshop_checkout(text, text, timestamptz, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.pending_workshop_checkout(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fulfill_workshop_checkout(text, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_workshop_checkout(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_workshop_refund(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_workshop_email(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_workshop_email_sent(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_workshop_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workshop_registration(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_workshop_discount(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_workshop_discount(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_workshop_checkout(text, text, timestamptz, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.pending_workshop_checkout(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fulfill_workshop_checkout(text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_workshop_checkout(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_workshop_refund(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_workshop_email(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_workshop_email_sent(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_workshop_email(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.list_public_workshops() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_workshops() TO anon, authenticated, service_role;
