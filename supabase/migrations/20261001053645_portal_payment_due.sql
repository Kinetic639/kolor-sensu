-- Pay-later in the portals (docs/product/booking-plan.md, R11): the visits
-- carry the time a reservation must be paid by, the booking window says
-- how long before a visit that is, and the centre can send the link to pay
-- again (the client lost the e-mail). The site sends it; the database only
-- lets the reservation's e-mail be claimed once more, not more often than
-- every five minutes.

-- The visits the portals see, with the time to pay by.
DROP FUNCTION public.search_visits(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean);
DROP FUNCTION public.get_visit(uuid, boolean);
DROP FUNCTION private.visible_visits(boolean);

CREATE FUNCTION private.visible_visits(p_own boolean)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone)
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

CREATE FUNCTION public.search_visits(p_query text DEFAULT NULL::text, p_statuses text[] DEFAULT NULL::text[], p_payment text DEFAULT NULL::text, p_specialist_id uuid DEFAULT NULL::uuid, p_service_id uuid DEFAULT NULL::uuid, p_room_id uuid DEFAULT NULL::uuid, p_online boolean DEFAULT NULL::boolean, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sort text DEFAULT 'starts_at'::text, p_desc boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, total_count bigint)
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
     OR p_sort NOT IN ('starts_at', 'client', 'specialist', 'service', 'price', 'status', 'place') THEN
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
  SELECT v.*, count(*) OVER () AS total_count
  FROM private.visible_visits(p_own) AS v
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
    v.starts_at, v.reference
  LIMIT p_limit OFFSET p_offset;
END;
$function$;
REVOKE ALL ON FUNCTION public.search_visits(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_visits(text, text[], text, uuid, uuid, uuid, boolean, timestamptz, timestamptz, text, boolean, integer, integer, boolean) TO authenticated, service_role;

CREATE FUNCTION public.get_visit(p_id uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, emails jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  RETURN QUERY
  SELECT v.*,
    CASE WHEN v_admin THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object('kind', email.kind, 'sent_at', email.sent_at)
        ORDER BY email.claimed_at)
      FROM public.booking_emails AS email
      WHERE email.appointment_id = v.id AND email.sent_at IS NOT NULL
    ), '[]'::jsonb) END
  FROM private.visible_visits(p_own) AS v
  WHERE v.id = p_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_visit(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit(uuid, boolean) TO authenticated, service_role;

DROP FUNCTION public.list_visits(date, date, uuid, boolean);
CREATE FUNCTION public.list_visits(p_from date, p_to date, p_specialist_id uuid DEFAULT NULL::uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, payment_due_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_tz text;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'A range of one to 63 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT timezone INTO v_tz FROM public.center_settings WHERE center_settings.id = 1;

  RETURN QUERY
  SELECT v.id, v.reference, v.status, v.mode, v.starts_at, v.ends_at,
    v.service_name, v.specialist_id, v.specialist_name, v.specialist_color,
    v.room_id, v.room_name, v.room_color, v.location_name,
    v.client_name, v.client_email, v.client_phone, v.client_notes,
    v.price_minor, v.currency_code, v.paid, v.refund_due_minor, v.refunded_minor,
    v.cancelled_by, v.cancelled_at, v.reschedule_count, v.payment_due_at
  FROM private.visible_visits(p_own) AS v
  WHERE (v.starts_at AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (p_specialist_id IS NULL OR v.specialist_id = p_specialist_id)
  ORDER BY v.starts_at, v.reference;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_visits(date, date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visits(date, date, uuid, boolean) TO authenticated, service_role;

-- How long before a visit it must be paid by (the wizard says so).
DROP FUNCTION public.booking_window();
CREATE FUNCTION public.booking_window()
 RETURNS TABLE(time_zone text, horizon_days integer, hold_minutes integer, cancellation_window_hours integer, reschedule_window_hours integer, max_self_reschedules integer, payment_due_hours integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT timezone, max_booking_horizon_days, hold_minutes,
    cancellation_window_hours, reschedule_window_hours, max_self_reschedules,
    payment_due_hours
  FROM public.center_settings
  WHERE id = 1;
$function$;
GRANT EXECUTE ON FUNCTION public.booking_window() TO anon, authenticated, service_role;

-- The centre sends the link to pay again: an admin for any reservation, a
-- specialist for their own; while it can still be paid, and not more
-- often than every five minutes. The reservation's e-mail may then be
-- claimed (and sent by the site) once more.
CREATE FUNCTION public.centre_resend_payment_link(p_appointment_id uuid)
RETURNS TABLE (reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  PERFORM private.managed_specialist_id(v_visit.specialist_id);
  IF v_visit.status <> 'awaiting_payment' OR v_visit.payment_due_at IS NULL
     OR v_visit.payment_due_at <= now() OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = v_visit.id AND email.kind = 'reserved'
      AND email.claimed_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'The link was sent a moment ago' USING HINT = 'recently_sent';
  END IF;
  DELETE FROM public.booking_emails AS email
  WHERE email.appointment_id = v_visit.id AND email.kind = 'reserved';
  RETURN QUERY SELECT v_visit.reference;
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_resend_payment_link(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_resend_payment_link(uuid) TO authenticated, service_role;
