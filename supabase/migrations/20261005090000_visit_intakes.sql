-- The questionnaire before a first consultation (the booking wizard): a
-- service can ask for it (the psychological consultation does). The site
-- keeps the answers as soon as they are given, under a random token in the
-- visitor's cookie, and ties them to the visit when its details are saved.
-- They are health data, given with the client's explicit consent: read
-- only by the centre and the visit's specialist; never kept untied for
-- more than a day. A mood of 0 (a crisis) is never booked: the site points
-- to help instead, and the database refuses it too.

ALTER TABLE public.services
  ADD COLUMN requires_intake boolean NOT NULL DEFAULT false;

UPDATE public.services SET requires_intake = true
WHERE slug = 'konsultacja-psychologiczna';

CREATE TABLE public.visit_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash bytea NOT NULL UNIQUE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  appointment_id uuid UNIQUE REFERENCES public.appointments (id) ON DELETE CASCADE,
  version smallint NOT NULL DEFAULT 1,
  mood smallint NOT NULL,
  answers jsonb NOT NULL,
  health_consent_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_intakes_mood_bookable CHECK (mood BETWEEN 1 AND 10),
  CONSTRAINT visit_intakes_answers_object CHECK (jsonb_typeof(answers) = 'object')
);

CREATE INDEX visit_intakes_service_id_idx ON public.visit_intakes (service_id);

ALTER TABLE public.visit_intakes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visit_intakes FROM anon, authenticated;
GRANT SELECT ON public.visit_intakes TO authenticated;

CREATE POLICY "The centre and the visit's specialist read its intake"
ON public.visit_intakes
FOR SELECT
TO authenticated
USING (
  public.has_role('admin')
  OR EXISTS (
    SELECT 1
    FROM public.appointments AS visit
    JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
    WHERE visit.id = visit_intakes.appointment_id
      AND specialist.user_id = (SELECT auth.uid())
  )
);

-- The held visit (by its access token) takes its intake (by its token),
-- when its service asks for one. Refused (hint `intake_required`) when it
-- asks and there is none for it.
CREATE FUNCTION public.attach_visit_intake(p_access_token text, p_intake_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_required boolean;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'hold_expired';
  END IF;
  SELECT service.requires_intake INTO v_required
  FROM public.services AS service WHERE service.id = v_visit.service_id;
  IF NOT coalesce(v_required, false) THEN
    RETURN false;
  END IF;
  IF EXISTS (SELECT 1 FROM public.visit_intakes WHERE appointment_id = v_visit.id) THEN
    RETURN true;
  END IF;

  UPDATE public.visit_intakes
  SET appointment_id = v_visit.id
  WHERE token_hash = extensions.digest(coalesce(p_intake_token, ''), 'sha256')
    AND appointment_id IS NULL
    AND service_id = v_visit.service_id
    AND created_at > now() - interval '1 day';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The questionnaire is required first' USING HINT = 'intake_required';
  END IF;
  RETURN true;
END;
$function$;
REVOKE ALL ON FUNCTION public.attach_visit_intake(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_visit_intake(text, text) TO service_role;

-- Answers never tied to a visit are not kept past a day.
CREATE FUNCTION private.forget_untied_intakes()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH gone AS (
    DELETE FROM public.visit_intakes
    WHERE appointment_id IS NULL AND created_at < now() - interval '1 day'
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone;
$function$;
REVOKE ALL ON FUNCTION private.forget_untied_intakes() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'forget-untied-intakes',
  '17 * * * *',
  'SELECT private.forget_untied_intakes()'
);
