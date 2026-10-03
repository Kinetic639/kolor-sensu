-- The clients list filters as the bookings table does (R15): whether a
-- client has a visit to come, when their last visit was and since when they
-- are a client, beside the search. search_clients changes its arguments, so
-- it is made anew; otherwise as before.
DROP FUNCTION public.search_clients(text, text, boolean, integer, integer);

CREATE FUNCTION public.search_clients(
  p_query text DEFAULT NULL,
  p_upcoming boolean DEFAULT NULL,
  p_last_from timestamptz DEFAULT NULL,
  p_last_to timestamptz DEFAULT NULL,
  p_created_from timestamptz DEFAULT NULL,
  p_created_to timestamptz DEFAULT NULL,
  p_sort text DEFAULT 'last_visit',
  p_desc boolean DEFAULT true,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, name text, email text, phone text, notes text,
  visits integer, upcoming integer, cancelled integer,
  last_visit_at timestamptz, next_visit_at timestamptz, paid_minor integer,
  created_at timestamptz, total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_pattern text;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0
     OR p_sort IS NULL
     OR p_sort NOT IN ('name', 'last_visit', 'next_visit', 'visits', 'paid', 'created') THEN
    RAISE EXCEPTION 'Invalid page or sort' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  v_pattern := '%' || replace(replace(replace(btrim(coalesce(p_query, '')),
    '\', '\\'), '%', '\%'), '_', '\_') || '%';

  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone, client.notes,
    coalesce(totals.visits, 0), coalesce(totals.upcoming, 0),
    coalesce(totals.cancelled, 0), totals.last_visit_at, totals.next_visit_at,
    coalesce(totals.paid_minor, 0), client.created_at,
    count(*) OVER ()
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE (nullif(btrim(coalesce(p_query, '')), '') IS NULL
      OR client.name ILIKE v_pattern ESCAPE '\'
      OR client.email ILIKE v_pattern ESCAPE '\'
      OR coalesce(client.phone, '') ILIKE v_pattern ESCAPE '\')
    AND (p_upcoming IS NULL OR (coalesce(totals.upcoming, 0) > 0) = p_upcoming)
    AND (p_last_from IS NULL OR totals.last_visit_at >= p_last_from)
    AND (p_last_to IS NULL OR totals.last_visit_at < p_last_to)
    AND (p_created_from IS NULL OR client.created_at >= p_created_from)
    AND (p_created_to IS NULL OR client.created_at < p_created_to)
  ORDER BY
    CASE WHEN p_sort = 'name' AND NOT p_desc THEN lower(client.name) END ASC,
    CASE WHEN p_sort = 'name' AND p_desc THEN lower(client.name) END DESC,
    CASE WHEN p_sort = 'last_visit' AND NOT p_desc THEN totals.last_visit_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'last_visit' AND p_desc THEN totals.last_visit_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'next_visit' AND NOT p_desc THEN totals.next_visit_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'next_visit' AND p_desc THEN totals.next_visit_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'visits' AND NOT p_desc THEN coalesce(totals.visits, 0) END ASC,
    CASE WHEN p_sort = 'visits' AND p_desc THEN coalesce(totals.visits, 0) END DESC,
    CASE WHEN p_sort = 'paid' AND NOT p_desc THEN coalesce(totals.paid_minor, 0) END ASC,
    CASE WHEN p_sort = 'paid' AND p_desc THEN coalesce(totals.paid_minor, 0) END DESC,
    CASE WHEN p_sort = 'created' AND NOT p_desc THEN client.created_at END ASC,
    CASE WHEN p_sort = 'created' AND p_desc THEN client.created_at END DESC,
    lower(client.name), client.id
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
REVOKE ALL ON FUNCTION public.search_clients(text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_clients(text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer) TO authenticated;
