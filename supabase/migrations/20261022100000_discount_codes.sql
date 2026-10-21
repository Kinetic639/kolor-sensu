-- Discount codes (docs/product/vouchers-plan.md, PR 1): a code takes a
-- percentage or an amount off a visit, from and until optional dates, and
-- the admin can switch it off. A visit's price (price_minor) stays the
-- amount to pay, so payments, refunds and e-mails need no change: a visit
-- with a code also keeps its list price, the discount and the code.
--
-- The admin manages codes through functions (the table takes no direct
-- access); the site's server applies and removes a code on a held visit
-- (service_role, like the rest of the booking) and confirms a visit the
-- code made free, without a payment.

CREATE TABLE public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9][A-Z0-9_-]{2,31}$'),
  kind text NOT NULL CHECK (kind IN ('percent', 'amount')),
  -- Percent: 1–100; amount: in grosze.
  value integer NOT NULL CHECK (
    (kind = 'percent' AND value BETWEEN 1 AND 100)
    OR (kind = 'amount' AND value BETWEEN 1 AND 10000000)
  ),
  starts_on date,
  ends_on date,
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_dates_valid CHECK (
    starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on
  )
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discount_codes FROM anon, authenticated;

ALTER TABLE public.appointments
  ADD COLUMN list_price_minor integer,
  ADD COLUMN discount_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN discount_code_id uuid REFERENCES public.discount_codes (id) ON DELETE RESTRICT,
  ADD CONSTRAINT appointments_discount_valid CHECK (
    (discount_code_id IS NULL AND list_price_minor IS NULL AND discount_minor = 0)
    OR (
      discount_code_id IS NOT NULL
      AND list_price_minor IS NOT NULL
      AND discount_minor BETWEEN 0 AND list_price_minor
      AND price_minor = list_price_minor - discount_minor
    )
  );

CREATE INDEX appointments_discount_code_idx
  ON public.appointments (discount_code_id) WHERE discount_code_id IS NOT NULL;

GRANT SELECT (list_price_minor, discount_minor, discount_code_id)
  ON public.appointments TO authenticated;

-- ------------------------------------------------------------ the admin

-- A code's discount on a price, in grosze (never more than the price).
CREATE OR REPLACE FUNCTION private.discount_on(
  p_kind text, p_value integer, p_price_minor integer
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT least(
    p_price_minor,
    CASE p_kind
      WHEN 'percent' THEN round(p_price_minor * p_value / 100.0)::integer
      ELSE p_value
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.list_discount_codes()
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
  discount_total_minor bigint
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
    count(visit.id) FILTER (WHERE visit.status IN ('awaiting_payment', 'confirmed')),
    coalesce(sum(visit.discount_minor) FILTER (WHERE visit.status = 'confirmed'), 0)
  FROM public.discount_codes AS dc
  LEFT JOIN public.appointments AS visit ON visit.discount_code_id = dc.id
  GROUP BY dc.id
  ORDER BY dc.created_at DESC;
END;
$$;

-- Adds a code (p_id null) or changes one; the code is kept in capitals.
CREATE OR REPLACE FUNCTION public.save_discount_code(
  p_id uuid,
  p_code text,
  p_kind text,
  p_value integer,
  p_starts_on date,
  p_ends_on date,
  p_active boolean,
  p_note text
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
    INSERT INTO public.discount_codes (code, kind, value, starts_on, ends_on, active, note)
    VALUES (upper(btrim(p_code)), p_kind, p_value, p_starts_on, p_ends_on, p_active, coalesce(p_note, ''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.discount_codes SET
      code = upper(btrim(p_code)), kind = p_kind, value = p_value,
      starts_on = p_starts_on, ends_on = p_ends_on, active = p_active,
      note = coalesce(p_note, ''), updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Discount code not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- Deletes a code no visit used (a used one is switched off instead).
CREATE OR REPLACE FUNCTION public.delete_discount_code(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF EXISTS (SELECT 1 FROM public.appointments WHERE discount_code_id = p_id) THEN
    RAISE EXCEPTION 'discount_code_used';
  END IF;
  DELETE FROM public.discount_codes WHERE id = p_id;
END;
$$;

-- ------------------------------------------------------------ the booking

-- A held visit by its guest's token, locked (none: not held any more).
CREATE OR REPLACE FUNCTION private.held_visit(p_access_token text)
RETURNS public.appointments
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'held' OR v_visit.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  RETURN v_visit;
END;
$$;

-- Applies a code to a held visit (another code replaces it); the payment
-- begun at the old price is given up. Refusals: code_unknown (none, or
-- switched off), code_not_started, code_expired.
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
  v_today date := (now() AT TIME ZONE 'Europe/Warsaw')::date;
  v_list integer;
  v_discount integer;
BEGIN
  v_visit := private.held_visit(p_access_token);
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

-- Takes a code off a held visit: its list price again.
CREATE OR REPLACE FUNCTION public.remove_discount_code(p_access_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.held_visit(p_access_token);
  IF v_visit.discount_code_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments AS visit SET
    price_minor = v_visit.list_price_minor,
    list_price_minor = NULL,
    discount_minor = 0,
    discount_code_id = NULL
  WHERE visit.id = v_visit.id;
END;
$$;

-- A booking's code, if it has one (the guest's summary, the e-mails).
CREATE OR REPLACE FUNCTION public.get_booking_discount(p_access_token text)
RETURNS TABLE (code text, list_price_minor integer, discount_minor integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT dc.code, visit.list_price_minor, visit.discount_minor
  FROM public.appointments AS visit
  JOIN public.discount_codes AS dc ON dc.id = visit.discount_code_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

-- Confirms a held visit a code made free: nothing to pay, so no Stripe.
CREATE OR REPLACE FUNCTION public.confirm_free_booking(p_access_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.held_visit(p_access_token);
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  IF v_visit.price_minor <> 0 OR v_visit.discount_code_id IS NULL THEN
    RAISE EXCEPTION 'The visit is not free' USING HINT = 'not_free';
  END IF;
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
  WHERE id = v_visit.id;
END;
$$;

REVOKE ALL ON FUNCTION private.discount_on(text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.held_visit(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_discount_codes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_discount_code(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_discount_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_discount_code(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_discount_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remove_discount_code(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_booking_discount(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_free_booking(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_discount_code(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.remove_discount_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_booking_discount(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_free_booking(text) TO service_role;
