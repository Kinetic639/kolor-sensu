-- The client of a visit, for the "Klient" tab of the visit panel (R9, R15):
-- the centre's record of them (contact, their visits in numbers, the
-- centre's note), as get_client gives it. The centre only; none for a
-- visit not linked to a client (a hold).
CREATE FUNCTION public.get_visit_client(p_visit_id uuid)
RETURNS TABLE (
  id uuid, name text, email text, phone text, notes text,
  visits integer, upcoming integer, cancelled integer,
  last_visit_at timestamptz, next_visit_at timestamptz, paid_minor integer,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT found.*
  FROM public.appointments AS visit
  CROSS JOIN LATERAL public.get_client(visit.client_id) AS found
  WHERE visit.id = p_visit_id AND visit.client_id IS NOT NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_visit_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_client(uuid) TO authenticated;
