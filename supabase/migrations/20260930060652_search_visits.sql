-- The bookings table in the portals (docs/product/booking-plan.md, R9): the
-- database searches, filters, sorts and pages, and says how many visits
-- match; only one page goes to the portal. The same rules as list_visits:
-- admins see all (with payments), specialists their own (p_own also for a
-- specialist who is an admin); holds given back in the wizard never count.

CREATE INDEX IF NOT EXISTS appointments_starts_at_idx
  ON public.appointments ((lower(during)));
CREATE INDEX IF NOT EXISTS appointments_specialist_starts_at_idx
  ON public.appointments (specialist_id, (lower(during)));

CREATE FUNCTION public.search_visits(
  p_query text DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_refund_due boolean DEFAULT false,
  p_specialist_id uuid DEFAULT NULL,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_sort text DEFAULT 'starts_at',
  p_desc boolean DEFAULT false,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_own boolean DEFAULT false
)
RETURNS TABLE(
  id uuid,
  reference text,
  status public.appointment_status,
  mode public.visit_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  service_name text,
  specialist_id uuid,
  specialist_name text,
  specialist_color text,
  room_id uuid,
  room_name text,
  room_color text,
  location_name text,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  price_minor integer,
  currency_code text,
  paid boolean,
  refund_due_minor integer,
  refunded_minor integer,
  cancelled_by text,
  cancelled_at timestamptz,
  reschedule_count integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
  v_pattern text;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset < 0
     OR p_sort IS NULL
     OR p_sort NOT IN ('starts_at', 'client', 'specialist', 'service', 'price', 'status') THEN
    RAISE EXCEPTION 'Invalid page or sort' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_statuses IS NOT NULL
     AND NOT p_statuses <@ ARRAY['confirmed', 'awaiting_payment', 'cancelled'] THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  -- The words typed, as a literal (no LIKE wildcards of their own).
  IF nullif(btrim(p_query), '') IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(
      left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  WITH visits AS (
    SELECT visit.id, visit.reference, visit.status, visit.mode,
      lower(visit.during) AS starts_at, upper(visit.during) AS ends_at,
      service.name AS service_name,
      visit.specialist_id,
      coalesce(
        nullif(profile.display_name, ''),
        nullif(concat_ws(' ', account.first_name, account.last_name), ''),
        'Specjalista'
      ) AS specialist_name,
      specialist.color AS specialist_color,
      visit.room_id, room.name AS room_name, room.color AS room_color,
      location.name AS location_name,
      visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
      visit.price_minor, visit.currency_code,
      CASE WHEN v_admin THEN EXISTS (
        SELECT 1 FROM public.payments AS payment
        WHERE payment.appointment_id = visit.id
          AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
      ) END AS paid,
      CASE WHEN v_admin THEN visit.refund_due_minor END AS refund_due_minor,
      CASE WHEN v_admin THEN coalesce((
        SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
        WHERE payment.appointment_id = visit.id
      ), 0) END AS refunded_minor,
      visit.cancelled_by, visit.cancelled_at, visit.reschedule_count
    FROM public.appointments AS visit
    JOIN public.services AS service ON service.id = visit.service_id
    JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
    LEFT JOIN public.profiles AS account ON account.id = specialist.user_id
    LEFT JOIN public.specialist_public_profiles AS profile
      ON profile.specialist_id = visit.specialist_id
    LEFT JOIN public.rooms AS room ON room.id = visit.room_id
    LEFT JOIN public.locations AS location ON location.id = room.location_id
    WHERE (
        visit.status IN ('confirmed', 'awaiting_payment')
        OR (visit.status = 'cancelled'
            AND (visit.confirmed_at IS NOT NULL OR visit.cancelled_by = 'centre'))
      )
      AND (v_admin OR visit.specialist_id = v_own)
      AND (p_specialist_id IS NULL OR visit.specialist_id = p_specialist_id)
      AND (p_from IS NULL OR lower(visit.during) >= p_from)
      AND (p_to IS NULL OR lower(visit.during) < p_to)
      AND (p_statuses IS NULL OR visit.status::text = ANY (p_statuses))
  )
  SELECT v.*, count(*) OVER () AS total_count
  FROM visits AS v
  WHERE (v_pattern IS NULL
      OR v.client_name ILIKE v_pattern
      OR v.client_email ILIKE v_pattern
      OR v.client_phone ILIKE v_pattern
      OR v.reference ILIKE v_pattern
      OR v.service_name ILIKE v_pattern
      OR v.specialist_name ILIKE v_pattern)
    AND (NOT (p_refund_due AND v_admin)
      OR (v.status = 'cancelled' AND coalesce(v.refund_due_minor, 0) > coalesce(v.refunded_minor, 0)))
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
    v.starts_at, v.reference
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.search_visits(text, text[], boolean, uuid, timestamptz, timestamptz, text, boolean, integer, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_visits(text, text[], boolean, uuid, timestamptz, timestamptz, text, boolean, integer, integer, boolean) TO authenticated, service_role;
