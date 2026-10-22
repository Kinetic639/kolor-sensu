-- Discount codes by the centre's rules (audit of 22.10, R5–R6), for visits
-- and workshops alike:
--   - a code covers the whole price (a free visit or seat, confirmed
--     without Stripe, as docs/product/vouchers-plan.md settles) or leaves
--     at least 2 zł to pay, which is the least Stripe takes; in between it
--     is refused (code_too_big);
--   - a code may be limited to so many uses: the visits and seats that
--     have it, held, reserved or confirmed, count; the last use left goes
--     to whoever takes it first (code_used_up);
--   - guessing codes is limited: after 10 refused codes in an hour on one
--     hold, no code is tried any more (too_many_attempts).

ALTER TABLE public.discount_codes
  ADD COLUMN max_uses integer CHECK (max_uses BETWEEN 1 AND 100000);

COMMENT ON COLUMN public.discount_codes.max_uses IS
  'How many visits and workshop seats may have the code (held, reserved or confirmed); null: no limit.';

-- (The body of 20261022100000_discount_codes, with what is left to pay
-- either nothing or Stripe's least, 2 zł.)
CREATE OR REPLACE FUNCTION private.discount_on(
  p_kind text, p_value integer, p_price_minor integer
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  v_off integer := least(
    p_price_minor,
    CASE p_kind
      WHEN 'percent' THEN round(p_price_minor * p_value / 100.0)::integer
      ELSE p_value
    END
  );
BEGIN
  IF p_price_minor - v_off BETWEEN 1 AND 199 THEN
    RAISE EXCEPTION 'Free, or at least 2 zł to pay' USING HINT = 'code_too_big';
  END IF;
  RETURN v_off;
END;
$$;

-- ------------------------------------------------------------ guessing

CREATE TABLE private.discount_attempts (
  token_hash bytea NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX discount_attempts_token_idx ON private.discount_attempts (token_hash, at);

-- A code refused for a hold (a visit's or a seat's): counted against it.
CREATE FUNCTION public.note_discount_refusal(p_access_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  DELETE FROM private.discount_attempts WHERE at < now() - interval '1 hour';
  INSERT INTO private.discount_attempts (token_hash)
  VALUES (extensions.digest(p_access_token, 'sha256'));
$$;

-- Refuses any code once a hold had 10 refused in the last hour.
CREATE FUNCTION private.check_discount_attempts(p_access_token text)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
BEGIN
  IF (
    SELECT count(*) FROM private.discount_attempts AS attempt
    WHERE attempt.token_hash = extensions.digest(p_access_token, 'sha256')
      AND attempt.at > now() - interval '1 hour'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many codes tried' USING HINT = 'too_many_attempts';
  END IF;
END;
$$;

-- ------------------------------------------------------------ uses

-- Refuses a code with no use left for this visit or seat (the one asking
-- does not count against itself). The code is locked, so two holds cannot
-- both take its last use.
CREATE FUNCTION private.check_code_uses(
  p_code_id uuid, p_appointment_id uuid, p_registration_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_max integer;
BEGIN
  SELECT max_uses INTO v_max FROM public.discount_codes
  WHERE id = p_code_id
  FOR UPDATE;
  IF v_max IS NULL THEN
    RETURN;
  END IF;
  IF (
    SELECT count(*) FROM public.appointments AS visit
    WHERE visit.discount_code_id = p_code_id
      AND visit.id IS DISTINCT FROM p_appointment_id
      AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
  ) + (
    SELECT count(*) FROM public.workshop_registrations AS r
    WHERE r.discount_code_id = p_code_id
      AND r.id IS DISTINCT FROM p_registration_id
      AND (r.status IN ('awaiting_payment', 'confirmed')
        OR (r.status = 'held' AND r.hold_expires_at > now()))
  ) >= v_max THEN
    RAISE EXCEPTION 'The code has no use left' USING HINT = 'code_used_up';
  END IF;
END;
$$;

-- (The body of 20261023090000_workshop_signup, with the attempts and the
-- uses checked.)
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
  PERFORM private.check_discount_attempts(p_access_token);
  v_code := private.usable_discount_code(p_code, NULL);
  PERFORM private.check_code_uses(v_code.id, v_visit.id, NULL);

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

-- (The body of 20261023090000_workshop_signup, with the attempts and the
-- uses checked.)
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
  PERFORM private.check_discount_attempts(p_access_token);
  v_code := private.usable_discount_code(p_code, v_registration.workshop_id);
  PERFORM private.check_code_uses(v_code.id, NULL, v_registration.id);
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

-- ------------------------------------------------------------ the admin

-- (The body of 20261023090000_workshop_signup, with the limit of uses.)
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
  workshop_title text,
  max_uses integer
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
    dc.scope, dc.workshop_id, w.title, dc.max_uses
  FROM public.discount_codes AS dc
  LEFT JOIN public.workshops AS w ON w.id = dc.workshop_id
  ORDER BY dc.created_at DESC;
END;
$$;

-- (The body of 20261023090000_workshop_signup, with the limit of uses.)
DROP FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text, text, uuid);
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
  p_workshop_id uuid,
  p_max_uses integer DEFAULT NULL
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
    INSERT INTO public.discount_codes (code, kind, value, starts_on, ends_on, active, note, scope, workshop_id, max_uses)
    VALUES (upper(btrim(p_code)), p_kind, p_value, p_starts_on, p_ends_on, p_active,
      coalesce(p_note, ''), p_scope, p_workshop_id, p_max_uses)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.discount_codes SET
      code = upper(btrim(p_code)), kind = p_kind, value = p_value,
      starts_on = p_starts_on, ends_on = p_ends_on, active = p_active,
      note = coalesce(p_note, ''), scope = p_scope, workshop_id = p_workshop_id,
      max_uses = p_max_uses, updated_at = now()
    WHERE id = p_id
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Discount code not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION private.check_discount_attempts(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.check_code_uses(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.note_discount_refusal(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.note_discount_refusal(text) TO service_role;
REVOKE ALL ON FUNCTION public.list_discount_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_discount_codes() TO authenticated;
REVOKE ALL ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_discount_code(uuid, text, text, integer, date, date, boolean, text, text, uuid, integer) TO authenticated;
