-- Rezerwacje: each visit with its client (the client's card a click away),
-- and the archive. A visit is archived when nothing is left to do with
-- it: held (confirmed) or cancelled at least seven days ago, with no money
-- still owed back. The lists of all visits and the search leave the
-- archive out unless asked (p_archived: null all, false without it, true
-- only it); the client's card shows everything. Nothing is moved: the
-- rule is worked out as the list is read.

DROP FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean);
DROP FUNCTION private.visible_visits(boolean);

CREATE FUNCTION private.visible_visits(p_own boolean)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_id uuid, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
BEGIN
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN QUERY
  SELECT visit.id, visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during),
    visit.service_id, service.name,
    visit.specialist_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(concat_ws(' ', account.first_name, account.last_name), ''),
      'Specjalista'
    ),
    specialist.color,
    visit.room_id, room.name, room.color, location.name,
    visit.client_id,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.price_minor, visit.currency_code,
    CASE WHEN v_admin THEN EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ) END,
    CASE WHEN v_admin THEN visit.refund_due_minor END,
    CASE WHEN v_admin THEN coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0) END,
    visit.cancelled_by, visit.cancelled_at, visit.reschedule_count,
    visit.created_at, visit.confirmed_at, visit.payment_due_at
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.profiles AS account ON account.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE private.shown_as_visit(visit)
    AND (v_admin OR visit.specialist_id = v_own);
END;
$function$;

REVOKE ALL ON FUNCTION private.visible_visits(boolean) FROM PUBLIC, anon, authenticated;

-- Archived: nothing left to do with the visit.
CREATE FUNCTION private.visit_archived(
  p_status appointment_status,
  p_ends_at timestamptz,
  p_cancelled_at timestamptz,
  p_refund_due integer,
  p_refunded integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  -- Held: a week after it. Cancelled: once its time has passed and a week
  -- after the cancellation, whichever comes later.
  SELECT coalesce(p_refund_due, 0) <= coalesce(p_refunded, 0)
    AND CASE p_status
      WHEN 'confirmed' THEN p_ends_at < now() - interval '7 days'
      WHEN 'cancelled' THEN p_ends_at < now()
        AND coalesce(p_cancelled_at, p_ends_at) < now() - interval '7 days'
      ELSE false
    END;
$$;

REVOKE ALL ON FUNCTION private.visit_archived(appointment_status, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.search_bookings(p_query text DEFAULT NULL::text, p_statuses text[] DEFAULT NULL::text[], p_payments text[] DEFAULT NULL::text[], p_specialist_ids uuid[] DEFAULT NULL::uuid[], p_service_ids uuid[] DEFAULT NULL::uuid[], p_room_ids uuid[] DEFAULT NULL::uuid[], p_online boolean DEFAULT NULL::boolean, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_changed_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_changed_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sort text DEFAULT 'starts_at'::text, p_desc boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_own boolean DEFAULT false, p_archived boolean DEFAULT NULL::boolean)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_id uuid, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, changed_at timestamp with time zone, archived boolean, total_count bigint)
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
    private.visit_archived(v.status, v.ends_at, v.cancelled_at,
      v.refund_due_minor, v.refunded_minor) AS archived,
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
    AND (p_archived IS NULL
      OR private.visit_archived(v.status, v.ends_at, v.cancelled_at,
        v.refund_due_minor, v.refunded_minor) = p_archived)
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

REVOKE ALL ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean, boolean) TO authenticated, service_role;
