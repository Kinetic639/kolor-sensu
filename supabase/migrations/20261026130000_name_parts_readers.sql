-- The readers that fill a form or sort a list give the name's two parts
-- too (20261026120000): a held visit and a workshop seat (their details
-- filled in again), a client's card (edited) and a visit's client (that
-- card), and the two client lists,
-- which now sort by the last name and find "Nowak Anna" as well as
-- "Anna Nowak". Each is its whole current body (20261006120000,
-- 20261025150000) with the parts last; its grants as before.

DROP FUNCTION public.search_clients(text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer);
CREATE FUNCTION "public"."search_clients"("p_query" "text" DEFAULT NULL::"text", "p_upcoming" boolean DEFAULT NULL::boolean, "p_last_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_last_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_from" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_created_to" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sort" "text" DEFAULT 'last_visit'::"text", "p_desc" boolean DEFAULT true, "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "total_count" bigint, "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    count(*) OVER (),
    client.first_name, client.last_name
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE (nullif(btrim(coalesce(p_query, '')), '') IS NULL
      OR client.name ILIKE v_pattern ESCAPE '\'
      OR concat_ws(' ', client.last_name, client.first_name) ILIKE v_pattern ESCAPE '\'
      OR client.email ILIKE v_pattern ESCAPE '\'
      OR coalesce(client.phone, '') ILIKE v_pattern ESCAPE '\')
    AND (p_upcoming IS NULL OR (coalesce(totals.upcoming, 0) > 0) = p_upcoming)
    AND (p_last_from IS NULL OR totals.last_visit_at >= p_last_from)
    AND (p_last_to IS NULL OR totals.last_visit_at < p_last_to)
    AND (p_created_from IS NULL OR client.created_at >= p_created_from)
    AND (p_created_to IS NULL OR client.created_at < p_created_to)
  ORDER BY
    CASE WHEN p_sort = 'name' AND NOT p_desc THEN lower(concat_ws(' ', client.last_name, client.first_name)) END ASC,
    CASE WHEN p_sort = 'name' AND p_desc THEN lower(concat_ws(' ', client.last_name, client.first_name)) END DESC,
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
    lower(concat_ws(' ', client.last_name, client.first_name)), client.id
  LIMIT p_limit OFFSET p_offset;
END;
$$;

DROP FUNCTION public.get_client(uuid);
CREATE FUNCTION "public"."get_client"("p_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone, client.notes,
    coalesce(totals.visits, 0), coalesce(totals.upcoming, 0),
    coalesce(totals.cancelled, 0), totals.last_visit_at, totals.next_visit_at,
    coalesce(totals.paid_minor, 0), client.created_at, client.updated_at,
    client.first_name, client.last_name
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE client.id = p_id;
END;
$$;

-- A visit's client is the card above, so its columns follow.
DROP FUNCTION public.get_visit_client(uuid);
CREATE FUNCTION "public"."get_visit_client"("p_visit_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "notes" "text", "visits" integer, "upcoming" integer, "cancelled" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "paid_minor" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
$$;

DROP FUNCTION public.my_clients(text);
CREATE FUNCTION "public"."my_clients"("p_query" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "phone" "text", "visits" integer, "upcoming" integer, "last_visit_at" timestamp with time zone, "next_visit_at" timestamp with time zone, "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_own uuid;
  v_pattern text;
BEGIN
  SELECT specialist.id INTO v_own FROM public.specialists AS specialist
  WHERE specialist.user_id = (SELECT auth.uid());
  IF v_own IS NULL THEN
    RAISE EXCEPTION 'Only specialists have their own clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF nullif(btrim(p_query), '') IS NOT NULL THEN
    v_pattern := '%' || replace(replace(replace(
      left(btrim(p_query), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  END IF;

  RETURN QUERY
  SELECT client.id, client.name, client.email, client.phone,
    (count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')))::integer,
    (count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now()))::integer,
    max(lower(visit.during)) FILTER (WHERE visit.status = 'confirmed'
      AND lower(visit.during) <= now()),
    min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now()),
    client.first_name, client.last_name
  FROM public.appointments AS visit
  JOIN public.clients AS client ON client.id = visit.client_id
  WHERE visit.specialist_id = v_own
    AND visit.status IN ('confirmed', 'awaiting_payment', 'cancelled')
    AND client.forgotten_at IS NULL
    AND (v_pattern IS NULL
      OR client.name ILIKE v_pattern
      OR concat_ws(' ', client.last_name, client.first_name) ILIKE v_pattern
      OR client.email ILIKE v_pattern
      OR client.phone ILIKE v_pattern)
  GROUP BY client.id
  ORDER BY min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
      AND lower(visit.during) > now()) NULLS LAST, lower(concat_ws(' ', client.last_name, client.first_name));
END;
$$;

DROP FUNCTION public.get_booking(text);
CREATE FUNCTION "public"."get_booking"("p_access_token" "text") RETURNS TABLE("reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "hold_expires_at" timestamp with time zone, "service_name" "text", "specialist_name" "text", "room_name" "text", "location_name" "text", "price_minor" integer, "currency_code" "text", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "details_saved" boolean, "reschedule_count" integer, "cancelled_by" "text", "refund_due_minor" integer, "refunded_minor" integer, "booked_by" "text", "paid" boolean, "payment_due_at" timestamp with time zone, "client_first_name" "text", "client_last_name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during), visit.hold_expires_at,
    service.name, profile.display_name, room.name, location.name,
    visit.price_minor, visit.currency_code,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.terms_accepted_at IS NOT NULL AND visit.privacy_accepted_at IS NOT NULL,
    visit.reschedule_count, visit.cancelled_by, visit.refund_due_minor,
    coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0),
    visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    visit.payment_due_at,
    visit.client_first_name, visit.client_last_name
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

DROP FUNCTION public.get_workshop_registration(text);
CREATE FUNCTION public.get_workshop_registration(p_access_token text)
RETURNS TABLE (
  reference text,
  status public.workshop_registration_status,
  workshop_slug text,
  workshop_title text,
  workshop_status public.workshop_status,
  workshop_confirmed boolean,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  room_name text,
  price_minor integer,
  currency_code text,
  paid_minor integer,
  refund_due_minor integer,
  refunded_minor integer,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  details_saved boolean,
  hold_expires_at timestamptz,
  payment_due_at timestamptz,
  offer_expires_at timestamptz,
  waitlist_position integer,
  full_refund_until timestamptz,
  can_pay_later boolean,
  cancelled_by text,
  meeting_url text,
  list_price_minor integer,
  discount_minor integer,
  discount_code text,
  refund_any_time boolean,
  refund_when_replaced boolean,
  workshop_cancel_reason text,
  paid_outside boolean,
  location_directions text,
  client_first_name text,
  client_last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.reference,
    CASE
      WHEN r.status = 'held' AND r.hold_expires_at <= now() THEN 'expired'
      WHEN r.status = 'offered' AND r.offer_expires_at <= now() THEN 'expired'
      WHEN r.status = 'awaiting_payment' AND r.payment_due_at <= now() THEN 'cancelled'
      ELSE r.status
    END::public.workshop_registration_status,
    w.slug, w.title, w.status,
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.modality, w.starts_at, w.ends_at,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    room.name,
    r.price_minor, r.currency_code, r.paid_minor, r.refund_due_minor, r.refunded_minor,
    r.client_name, r.client_email, r.client_phone, r.client_notes,
    r.client_email IS NOT NULL AND (r.terms_accepted_at IS NOT NULL OR r.booked_by = 'centre'),
    r.hold_expires_at, r.payment_due_at, r.offer_expires_at,
    CASE WHEN r.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = r.workshop_id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (r.waitlisted_at, r.created_at)
    ) END,
    w.starts_at - private.workshop_notice(),
    r.price_minor > 0 AND w.starts_at - private.workshop_notice() > now(),
    r.cancelled_by,
    CASE WHEN r.status = 'confirmed' AND w.status = 'published' THEN link.meeting_url END,
    r.list_price_minor, r.discount_minor, dc.code,
    r.refund_any_time, r.refund_when_replaced, w.cancel_reason, r.paid_outside,
    location.directions,
    r.client_first_name, r.client_last_name
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_online_links AS link ON link.workshop_id = w.id
  LEFT JOIN public.discount_codes AS dc ON dc.id = r.discount_code_id
  WHERE r.id = private.workshop_registration_id(p_access_token);
$$;

REVOKE ALL ON FUNCTION public.search_clients(text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.search_clients(text, boolean, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_client(uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_client(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_visit_client(uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_visit_client(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.my_clients(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.my_clients(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_booking(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_booking(text) TO service_role;
REVOKE ALL ON FUNCTION public.get_workshop_registration(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workshop_registration(text) TO service_role;
