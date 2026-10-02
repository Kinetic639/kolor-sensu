-- How many visits each view of the bookings table holds (R9), in one call
-- instead of one a view: each view's filters go through search_visits, so
-- the same rules apply (who sees what, valid filters). At most 20 views.
CREATE FUNCTION public.count_visit_views(p_views jsonb)
RETURNS TABLE (view_id text, total bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_view jsonb;
BEGIN
  IF jsonb_typeof(p_views) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_views) > 20 THEN
    RAISE EXCEPTION 'Invalid views' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  FOR v_view IN SELECT value FROM jsonb_array_elements(p_views) LOOP
    view_id := v_view->>'id';
    SELECT coalesce(max(found.total_count), 0) INTO total
    FROM public.search_visits(
      p_query => v_view->>'query',
      p_statuses => (
        SELECT array_agg(status)
        FROM jsonb_array_elements_text(v_view->'statuses') AS status
      ),
      p_payment => v_view->>'payment',
      p_specialist_id => (v_view->>'specialistId')::uuid,
      p_service_id => (v_view->>'serviceId')::uuid,
      p_room_id => (v_view->>'roomId')::uuid,
      p_online => (v_view->>'online')::boolean,
      p_from => (v_view->>'from')::timestamptz,
      p_to => (v_view->>'to')::timestamptz,
      p_limit => 1,
      p_own => coalesce((v_view->>'own')::boolean, false)
    ) AS found;
    RETURN NEXT;
  END LOOP;
END;
$function$;
REVOKE ALL ON FUNCTION public.count_visit_views(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_visit_views(jsonb) TO authenticated;
