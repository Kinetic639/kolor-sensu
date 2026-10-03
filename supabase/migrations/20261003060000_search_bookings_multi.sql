-- The bookings table's filters (R9) take several values each, as its
-- checkboxes do (payments, specialists, services, places: rooms and/or
-- online), and two more ranges: when a booking was made and when it last
-- changed. search_bookings changes its arguments, so it is made anew; the
-- views' counts follow. search_visits, no longer used, goes.
DROP FUNCTION public.search_bookings(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean);
DROP FUNCTION public.search_visits(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean);

CREATE FUNCTION public.search_bookings(
  p_query text DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_payments text[] DEFAULT NULL,
  p_specialist_ids uuid[] DEFAULT NULL,
  p_service_ids uuid[] DEFAULT NULL,
  p_room_ids uuid[] DEFAULT NULL,
  p_online boolean DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_created_from timestamptz DEFAULT NULL,
  p_created_to timestamptz DEFAULT NULL,
  p_changed_from timestamptz DEFAULT NULL,
  p_changed_to timestamptz DEFAULT NULL,
  p_sort text DEFAULT 'starts_at',
  p_desc boolean DEFAULT false,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_own boolean DEFAULT false
)
RETURNS TABLE(id uuid, reference text, status public.appointment_status, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamptz, reschedule_count integer, created_at timestamptz, confirmed_at timestamptz, payment_due_at timestamptz, changed_at timestamptz, total_count bigint)
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
  IF p_payments IS NOT NULL
     AND NOT p_payments <@ ARRAY['paid', 'unpaid', 'refund_due', 'refunded'] THEN
    RAISE EXCEPTION 'Invalid payment filter' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF cardinality(p_specialist_ids) > 50 OR cardinality(p_service_ids) > 50
     OR cardinality(p_room_ids) > 50 THEN
    RAISE EXCEPTION 'Too many values' USING ERRCODE = 'invalid_parameter_value';
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
  WHERE (p_specialist_ids IS NULL OR v.specialist_id = ANY (p_specialist_ids))
    AND (p_service_ids IS NULL OR v.service_id = ANY (p_service_ids))
    -- Places: these rooms, and/or online.
    AND ((p_room_ids IS NULL AND p_online IS NULL)
      OR v.room_id = ANY (p_room_ids)
      OR (p_online IS TRUE AND v.mode = 'online'))
    AND (p_from IS NULL OR v.starts_at >= p_from)
    AND (p_to IS NULL OR v.starts_at < p_to)
    AND (p_created_from IS NULL OR v.created_at >= p_created_from)
    AND (p_created_to IS NULL OR v.created_at < p_created_to)
    AND (p_changed_from IS NULL OR coalesce(changed.at, v.created_at) >= p_changed_from)
    AND (p_changed_to IS NULL OR coalesce(changed.at, v.created_at) < p_changed_to)
    AND (p_statuses IS NULL OR v.status::text = ANY (p_statuses))
    -- Payments: any of those asked for.
    AND (p_payments IS NULL
      OR ('paid' = ANY (p_payments) AND v.paid AND v.status <> 'cancelled')
      OR ('unpaid' = ANY (p_payments) AND NOT v.paid)
      OR ('refund_due' = ANY (p_payments) AND v.status = 'cancelled'
        AND coalesce(v.refund_due_minor, 0) > coalesce(v.refunded_minor, 0))
      OR ('refunded' = ANY (p_payments) AND coalesce(v.refunded_minor, 0) > 0))
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
REVOKE ALL ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean) TO authenticated, service_role;

-- The views' counts, with the same filters (lists where several).
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
      p_statuses => (SELECT array_agg(one) FROM jsonb_array_elements_text(v_view->'statuses') AS one),
      p_payments => (SELECT array_agg(one) FROM jsonb_array_elements_text(v_view->'payments') AS one),
      p_specialist_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'specialistIds') AS one),
      p_service_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'serviceIds') AS one),
      p_room_ids => (SELECT array_agg(one::uuid) FROM jsonb_array_elements_text(v_view->'roomIds') AS one),
      p_online => (v_view->>'online')::boolean,
      p_from => (v_view->>'from')::timestamptz,
      p_to => (v_view->>'to')::timestamptz,
      p_created_from => (v_view->>'createdFrom')::timestamptz,
      p_created_to => (v_view->>'createdTo')::timestamptz,
      p_changed_from => (v_view->>'changedFrom')::timestamptz,
      p_changed_to => (v_view->>'changedTo')::timestamptz,
      p_limit => 1,
      p_own => coalesce((v_view->>'own')::boolean, false)
    ) AS found;
    RETURN NEXT;
  END LOOP;
END;
$function$;
