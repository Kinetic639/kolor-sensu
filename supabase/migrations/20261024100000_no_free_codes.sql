-- No discount code makes a visit or a workshop seat free (the owner's
-- decision of 23.10, #179): a code takes off at most what leaves 2 zł to
-- pay, the least Stripe takes. A bigger code (an amount over the price, a
-- high percentage) is cut down to that; a price of 2 zł or less takes no
-- code. A percentage code is 1–99 %.

-- The codes saved as 100 % before: the most a code may be now.
UPDATE public.discount_codes SET value = 99, updated_at = now()
WHERE kind = 'percent' AND value = 100;

DO $$
DECLARE
  v_name text;
BEGIN
  SELECT con.conname INTO v_name
  FROM pg_constraint AS con
  WHERE con.conrelid = 'public.discount_codes'::regclass
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%percent%';
  EXECUTE format('ALTER TABLE public.discount_codes DROP CONSTRAINT %I', v_name);
END;
$$;

ALTER TABLE public.discount_codes
  ADD CONSTRAINT discount_codes_value_check CHECK (
    (kind = 'percent' AND value BETWEEN 1 AND 99)
    OR (kind = 'amount' AND value BETWEEN 1 AND 10000000)
  );

-- (The body of 20261023120000_discount_code_rules, with the discount cut
-- down to leave 2 zł instead of the code refused.)
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
    p_price_minor - 200,
    CASE p_kind
      WHEN 'percent' THEN round(p_price_minor * p_value / 100.0)::integer
      ELSE p_value
    END
  );
BEGIN
  IF v_off < 1 THEN
    RAISE EXCEPTION 'No code on a price of 2 zł or less' USING HINT = 'code_too_big';
  END IF;
  RETURN v_off;
END;
$$;
