-- The centre's clients (docs/product/booking-plan.md, R15). A client is a
-- person who booked (one per e-mail address): each visit that is a real
-- booking (shown in the portals) is linked to its client, created on the
-- first one; a hold someone gave up on makes no client. Admins only: the
-- list with the visits' totals, a client's card with every visit, and
-- correcting a client's details (which future visits follow) and an
-- internal note (never shown to the client, nor to specialists).

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  email_key text GENERATED ALWAYS AS (lower(btrim(email))) STORED,
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clients_email_key_unique UNIQUE (email_key),
  CONSTRAINT clients_details_valid CHECK (
    char_length(name) BETWEEN 1 AND 200
    AND char_length(email) <= 320
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (phone IS NULL OR char_length(phone) BETWEEN 3 AND 40)
    AND (notes IS NULL OR char_length(notes) <= 5000)
  )
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clients FROM anon, authenticated;

CREATE TRIGGER clients_set_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.appointments
  ADD COLUMN client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL;
CREATE INDEX appointments_client_id_idx ON public.appointments (client_id);

-- A visit that is a real booking belongs to its client (by e-mail).
CREATE FUNCTION private.link_appointment_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.client_email IS NULL OR NOT private.shown_as_visit(NEW) THEN
    RETURN NEW;
  END IF;
  IF NEW.client_id IS NOT NULL AND TG_OP = 'UPDATE'
     AND lower(btrim(NEW.client_email)) = lower(btrim(OLD.client_email)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.clients AS client (email, name, phone)
  VALUES (
    btrim(NEW.client_email),
    coalesce(nullif(btrim(NEW.client_name), ''), btrim(NEW.client_email)),
    nullif(btrim(NEW.client_phone), '')
  )
  ON CONFLICT (email_key) DO UPDATE
  SET phone = coalesce(client.phone, EXCLUDED.phone)
  RETURNING client.id INTO NEW.client_id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.link_appointment_client() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_link_client
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.link_appointment_client();

-- The clients there are already: one per address, with the latest name and
-- phone they gave.
INSERT INTO public.clients (email, name, phone, created_at)
SELECT DISTINCT ON (lower(btrim(visit.client_email)))
  btrim(visit.client_email),
  coalesce(nullif(btrim(visit.client_name), ''), btrim(visit.client_email)),
  nullif(btrim(visit.client_phone), ''),
  min(visit.created_at) OVER (PARTITION BY lower(btrim(visit.client_email)))
FROM public.appointments AS visit
WHERE visit.client_email IS NOT NULL AND private.shown_as_visit(visit)
ORDER BY lower(btrim(visit.client_email)), visit.created_at DESC;

UPDATE public.appointments AS visit
SET client_id = client.id
FROM public.clients AS client
WHERE client.email_key = lower(btrim(visit.client_email))
  AND private.shown_as_visit(visit);

-- A client's totals, from their visits (payments for admins).
CREATE FUNCTION private.client_totals()
RETURNS TABLE (
  client_id uuid, visits integer, upcoming integer, cancelled integer,
  last_visit_at timestamptz, next_visit_at timestamptz, paid_minor integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT visit.client_id,
    count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment'))::integer,
    count(*) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
                       AND lower(visit.during) > now())::integer,
    count(*) FILTER (WHERE visit.status = 'cancelled')::integer,
    max(lower(visit.during)) FILTER (WHERE visit.status = 'confirmed'
                                       AND lower(visit.during) <= now()),
    min(lower(visit.during)) FILTER (WHERE visit.status IN ('confirmed', 'awaiting_payment')
                                       AND lower(visit.during) > now()),
    coalesce(sum((
      SELECT sum(payment.amount_minor - payment.refunded_minor)
      FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'partially_refunded', 'refunded')
    )), 0)::integer
  FROM public.appointments AS visit
  WHERE visit.client_id IS NOT NULL
  GROUP BY visit.client_id;
$function$;
REVOKE ALL ON FUNCTION private.client_totals() FROM PUBLIC, anon, authenticated;

-- The admin's list: found by name, e-mail or phone (literally), sorted,
-- one page at a time.
CREATE FUNCTION public.search_clients(
  p_query text DEFAULT NULL,
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
  WHERE nullif(btrim(coalesce(p_query, '')), '') IS NULL
     OR client.name ILIKE v_pattern ESCAPE '\'
     OR client.email ILIKE v_pattern ESCAPE '\'
     OR coalesce(client.phone, '') ILIKE v_pattern ESCAPE '\'
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
REVOKE ALL ON FUNCTION public.search_clients(text, text, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_clients(text, text, boolean, integer, integer) TO authenticated;

-- One client's card.
CREATE FUNCTION public.get_client(p_id uuid)
RETURNS TABLE (
  id uuid, name text, email text, phone text, notes text,
  visits integer, upcoming integer, cancelled integer,
  last_visit_at timestamptz, next_visit_at timestamptz, paid_minor integer,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
    coalesce(totals.paid_minor, 0), client.created_at, client.updated_at
  FROM public.clients AS client
  LEFT JOIN private.client_totals() AS totals ON totals.client_id = client.id
  WHERE client.id = p_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client(uuid) TO authenticated;

-- A client's visits, latest first (as the bookings list shows them).
CREATE FUNCTION public.list_client_visits(p_client_id uuid)
RETURNS TABLE (
  id uuid, reference text, status public.appointment_status, mode public.visit_mode,
  starts_at timestamptz, ends_at timestamptz, service_name text,
  specialist_id uuid, specialist_name text, specialist_color text,
  room_id uuid, room_name text, room_color text, location_name text,
  client_name text, client_email text, client_phone text, client_notes text,
  price_minor integer, currency_code text, paid boolean, refund_due_minor integer,
  refunded_minor integer, cancelled_by text, cancelled_at timestamptz,
  reschedule_count integer, payment_due_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre sees its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT v.id, v.reference, v.status, v.mode, v.starts_at, v.ends_at,
    v.service_name, v.specialist_id, v.specialist_name, v.specialist_color,
    v.room_id, v.room_name, v.room_color, v.location_name,
    v.client_name, v.client_email, v.client_phone, v.client_notes,
    v.price_minor, v.currency_code, v.paid, v.refund_due_minor, v.refunded_minor,
    v.cancelled_by, v.cancelled_at, v.reschedule_count, v.payment_due_at
  FROM private.visible_visits(false) AS v
  JOIN public.appointments AS visit ON visit.id = v.id
  WHERE visit.client_id = p_client_id
  ORDER BY v.starts_at DESC, v.reference;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_client_visits(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_client_visits(uuid) TO authenticated;

-- The admin corrects a client's details and note. Visits still to come
-- follow (their e-mails go to the new address); past ones keep what the
-- client gave then.
CREATE FUNCTION public.admin_update_client(
  p_id uuid,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text
)
RETURNS TABLE (id uuid, upcoming_updated integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_name text := nullif(btrim(p_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_phone text := nullif(btrim(p_phone), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_count integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre changes its clients'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE clients.id = p_id) THEN
    RAISE EXCEPTION 'No such client' USING HINT = 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients
             WHERE clients.email_key = v_email AND clients.id <> p_id) THEN
    RAISE EXCEPTION 'Another client has this address' USING HINT = 'email_taken';
  END IF;

  BEGIN
    UPDATE public.clients
    SET name = v_name, email = v_email, phone = v_phone, notes = v_notes
    WHERE clients.id = p_id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The client''s details are not valid' USING HINT = 'invalid_details';
  END;

  UPDATE public.appointments
  SET client_name = v_name, client_email = v_email, client_phone = v_phone
  WHERE appointments.client_id = p_id
    AND appointments.status IN ('confirmed', 'awaiting_payment')
    AND lower(appointments.during) > now()
    AND (appointments.client_name, appointments.client_email, appointments.client_phone)
        IS DISTINCT FROM (v_name, v_email, v_phone);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT p_id, v_count;
END;
$function$;
REVOKE ALL ON FUNCTION public.admin_update_client(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_client(uuid, text, text, text, text) TO authenticated;
