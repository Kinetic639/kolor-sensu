-- Visits in the portals (docs/product/booking-plan.md, R9): specialists
-- see their own visits, admins all of them; the centre cancels a visit
-- (always with the money back). Holds and lapsed holds are not visits.

-- Booked visits starting within the local dates, oldest first. Admins
-- see all (optionally one specialist's), specialists their own; payments
-- only for admins.
CREATE FUNCTION public.list_visits(
  p_from date,
  p_to date,
  p_specialist_id uuid DEFAULT NULL
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
  v_admin boolean := public.has_role('admin');
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
  WHERE visit.status IN ('confirmed', 'awaiting_payment', 'cancelled')
    AND (lower(visit.during) AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (v_admin OR visit.specialist_id = v_own)
    AND (p_specialist_id IS NULL OR visit.specialist_id = p_specialist_id)
  ORDER BY lower(visit.during), visit.reference;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_visits(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visits(date, date, uuid) TO authenticated, service_role;

-- Cancelling by the centre (admins): the client gets back all they paid,
-- whenever it happens. Returns what to refund and from which payment; the
-- site's server asks Stripe and sends the e-mail.
CREATE FUNCTION public.centre_cancel_visit(p_appointment_id uuid)
RETURNS TABLE(reference text, refund_minor integer, payment_intent_id text, reschedule_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_paid boolean;
  v_refund integer := 0;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre cancels visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;

  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_paid := FOUND;
  IF v_paid THEN
    v_refund := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;

  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre',
      refund_due_minor = v_refund
  WHERE id = v_visit.id;

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END,
    v_visit.reschedule_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.centre_cancel_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_cancel_visit(uuid) TO authenticated, service_role;

-- The e-mail about a cancellation by the centre carries a new link: the
-- client has not used theirs, and the e-mail is sent from the centre's
-- side, which does not know it. Also says who cancelled.
DROP FUNCTION public.claim_booking_email(text, text);
CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE(reference text, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz, service_name text, specialist_name text, room_name text, location_name text, location_address text, price_minor integer, currency_code text, client_name text, client_email text, manage_token text, cancelled_by text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND
     OR v_visit.status <> (CASE WHEN p_kind = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END)::public.appointment_status THEN
    RETURN;
  END IF;

  INSERT INTO public.booking_emails AS email (appointment_id, kind)
  VALUES (v_visit.id, p_kind)
  ON CONFLICT (appointment_id, kind) DO UPDATE
  SET claimed_at = now()
  WHERE email.sent_at IS NULL AND email.claimed_at < now() - interval '10 minutes';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_kind IN ('confirmation', 'reminder')
     OR (p_kind = 'cancelled' AND v_visit.cancelled_by = 'centre') THEN
    v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
    UPDATE public.appointments
    SET manage_token_hash = extensions.digest(v_token, 'sha256')
    WHERE id = v_visit.id;
  END IF;

  RETURN QUERY
  SELECT v_visit.reference, v_visit.mode, lower(v_visit.during), upper(v_visit.during),
    service.name, profile.display_name, room.name, location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    v_visit.price_minor, v_visit.currency_code,
    v_visit.client_name, v_visit.client_email, v_token, v_visit.cancelled_by
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_email(text, text) TO service_role;
