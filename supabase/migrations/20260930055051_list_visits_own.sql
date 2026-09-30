-- Visits in the portals (R9): the specialist portal lists the specialist's
-- own visits even when they are also an admin (p_own).

DROP FUNCTION public.list_visits(date, date, uuid);
CREATE FUNCTION public.list_visits(
  p_from date,
  p_to date,
  p_specialist_id uuid DEFAULT NULL,
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
  reschedule_count integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  -- The specialist portal asks for its own visits (p_own), even when the
  -- specialist is also an admin: then no payments and nobody else's.
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
  v_tz text;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'A range of one to 63 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  SELECT timezone INTO v_tz FROM public.center_settings WHERE center_settings.id = 1;

  RETURN QUERY
  SELECT visit.id, visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during),
    service.name,
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
      -- A cancelled visit, not a hold the client gave back in the wizard.
      OR (visit.status = 'cancelled'
          AND (visit.confirmed_at IS NOT NULL OR visit.cancelled_by = 'centre'))
    )
    AND (lower(visit.during) AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (v_admin OR visit.specialist_id = v_own)
    AND (p_specialist_id IS NULL OR visit.specialist_id = p_specialist_id)
  ORDER BY lower(visit.during), visit.reference;
END;
$function$;


REVOKE ALL ON FUNCTION public.list_visits(date, date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visits(date, date, uuid, boolean) TO authenticated, service_role;
