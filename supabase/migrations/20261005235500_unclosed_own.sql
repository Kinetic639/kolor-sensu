-- The visits to close per specialist: a specialist's portal asks for
-- their own only (p_own), even when they are an admin too.
DROP FUNCTION public.unclosed_visits_summary();

CREATE FUNCTION public.unclosed_visits_summary(p_own boolean DEFAULT false)
RETURNS TABLE (specialist_id uuid, specialist_name text, visits integer,
  oldest_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT visit.specialist_id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    count(*)::integer, min(lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.visit_closures AS closure ON closure.appointment_id = visit.id
  WHERE closure.appointment_id IS NULL
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND ((NOT p_own AND public.has_role('admin'))
      OR specialist.user_id = (SELECT auth.uid()))
  GROUP BY visit.specialist_id, profile.display_name
  ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.unclosed_visits_summary(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unclosed_visits_summary(boolean) TO authenticated;
