-- The bookings table (R9) with when each booking last changed (made,
-- confirmed, moved, cancelled, paid, refunded: any event but an e-mail or a
-- payment begun), to show and to sort by. search_visits as it was, under a
-- new name with the new column (its result can't change in place); the
-- views' counts use it too. search_visits is left for now, unused.
CREATE FUNCTION public.search_bookings(p_query text DEFAULT NULL::text, p_statuses text[] DEFAULT NULL::text[], p_payment text DEFAULT NULL::text, p_specialist_id uuid DEFAULT NULL::uuid, p_service_id uuid DEFAULT NULL::uuid, p_room_id uuid DEFAULT NULL::uuid, p_online boolean DEFAULT NULL::boolean, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sort text DEFAULT 'starts_at'::text, p_desc boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, changed_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_pattern text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0
     OR p_sort IS NULL
     OR p_sort NOT IN ('starts_at', 'client', 'specialist', 'service', 'price', 'status', 'place', 'created', 'changed') THEN
    RAISE EXCEPTION 'Invalid page or sort' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_statuses IS NOT NULL
     AND NOT p_statuses <@ ARRAY['confirmed', 'awaiting_payment', 'cancelled'] THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_payment IS NOT NULL
     AND p_payment NOT IN ('paid', 'unpaid', 'refund_due', 'refunded') THEN
    RAISE EXCEPTION 'Invalid payment filter' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF nullif(btrim(p_query), '') IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(
      left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT v.*, coalesce(changed.at, v.created_at) AS changed_at,
    count(*) OVER () AS total_count
  FROM private.visible_visits(p_own) AS v
  -- The last change: any event but an e-mail or a payment begun.
  LEFT JOIN LATERAL (
    SELECT max(event.occurred_at) AS at
    FROM public.appointment_events AS event
    WHERE event.appointment_id = v.id
      AND event.kind NOT IN ('email_sent', 'payment_started')
  ) AS changed ON true
  WHERE (p_specialist_id IS NULL OR v.specialist_id = p_specialist_id)
    AND (p_service_id IS NULL OR v.service_id = p_service_id)
    AND (p_room_id IS NULL OR v.room_id = p_room_id)
    AND (p_online IS NULL OR (v.mode = 'online') = p_online)
    AND (p_from IS NULL OR v.starts_at >= p_from)
    AND (p_to IS NULL OR v.starts_at < p_to)
    AND (p_statuses IS NULL OR v.status::text = ANY (p_statuses))
    AND (p_payment IS NULL OR CASE p_payment
      WHEN 'paid' THEN v.paid AND v.status <> 'cancelled'
      WHEN 'unpaid' THEN NOT v.paid
      WHEN 'refund_due' THEN v.status = 'cancelled'
        AND coalesce(v.refund_due_minor, 0) > coalesce(v.refunded_minor, 0)
      WHEN 'refunded' THEN coalesce(v.refunded_minor, 0) > 0
    END)
    AND (v_pattern IS NULL
      OR v.client_name ILIKE v_pattern
      OR v.client_email ILIKE v_pattern
      OR v.client_phone ILIKE v_pattern
      OR v.reference ILIKE v_pattern
      OR v.service_name ILIKE v_pattern
      OR v.specialist_name ILIKE v_pattern)
  ORDER BY
    CASE WHEN p_sort = 'starts_at' AND NOT p_desc THEN v.starts_at END ASC,
    CASE WHEN p_sort = 'starts_at' AND p_desc THEN v.starts_at END DESC,
    CASE WHEN p_sort = 'client' AND NOT p_desc THEN lower(v.client_name) END ASC,
    CASE WHEN p_sort = 'client' AND p_desc THEN lower(v.client_name) END DESC,
    CASE WHEN p_sort = 'specialist' AND NOT p_desc THEN lower(v.specialist_name) END ASC,
    CASE WHEN p_sort = 'specialist' AND p_desc THEN lower(v.specialist_name) END DESC,
    CASE WHEN p_sort = 'service' AND NOT p_desc THEN lower(v.service_name) END ASC,
    CASE WHEN p_sort = 'service' AND p_desc THEN lower(v.service_name) END DESC,
    CASE WHEN p_sort = 'price' AND NOT p_desc THEN v.price_minor END ASC,
    CASE WHEN p_sort = 'price' AND p_desc THEN v.price_minor END DESC,
    CASE WHEN p_sort = 'status' AND NOT p_desc THEN v.status::text END ASC,
    CASE WHEN p_sort = 'status' AND p_desc THEN v.status::text END DESC,
    CASE WHEN p_sort = 'place' AND NOT p_desc THEN lower(coalesce(v.room_name, 'online')) END ASC,
    CASE WHEN p_sort = 'place' AND p_desc THEN lower(coalesce(v.room_name, 'online')) END DESC,
    CASE WHEN p_sort = 'created' AND NOT p_desc THEN v.created_at END ASC,
    CASE WHEN p_sort = 'created' AND p_desc THEN v.created_at END DESC,
    CASE WHEN p_sort = 'changed' AND NOT p_desc THEN coalesce(changed.at, v.created_at) END ASC,
    CASE WHEN p_sort = 'changed' AND p_desc THEN coalesce(changed.at, v.created_at) END DESC,
    v.starts_at, v.reference
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_bookings(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_bookings(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.count_visit_views(p_views jsonb)
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
    FROM public.search_bookings(
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
