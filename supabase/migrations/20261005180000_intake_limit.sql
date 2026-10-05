-- The questionnaire before a first consultation: at most five from one
-- visitor in a quarter of an hour (their key: an HMAC of their address,
-- as for holding a time), so a script cannot fill the table. Answers not
-- tied to a visit are removed within the hour anyway.
ALTER TABLE public.visit_intakes ADD COLUMN client_key text;

CREATE INDEX visit_intakes_client_key_idx
  ON public.visit_intakes (client_key, created_at)
  WHERE client_key IS NOT NULL;

CREATE FUNCTION private.limit_intakes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.client_key IS NOT NULL AND (
    SELECT count(*) FROM public.visit_intakes AS intake
    WHERE intake.client_key = NEW.client_key
      AND intake.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many questionnaires, try again later'
      USING ERRCODE = 'P0001', HINT = 'too_many_intakes';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.limit_intakes() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER visit_intakes_limit
BEFORE INSERT ON public.visit_intakes
FOR EACH ROW
EXECUTE FUNCTION private.limit_intakes();
