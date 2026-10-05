-- Closing a visit (the specialist's, or the centre's): did it take place
-- or did the client not come, a few tags about the visit itself (late,
-- shortened, a difficult contact, to follow up, a technical problem) and
-- a short note for the centre. Never anything about the client's health:
-- it is organisational, and seen only by the visit's specialist and the
-- admins. A held visit waits to be closed from its start for 30 days; the
-- specialist hears of it in their portal after the visit and in a morning
-- e-mail, the admin sees the backlog on the dashboard.

CREATE TYPE public.visit_outcome AS ENUM ('attended', 'no_show');

CREATE TABLE public.visit_closures (
  appointment_id uuid PRIMARY KEY REFERENCES public.appointments (id) ON DELETE CASCADE,
  outcome public.visit_outcome NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  note text,
  closed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visit_closures_tags CHECK (
    tags <@ ARRAY['late', 'shortened', 'difficult', 'follow_up', 'technical']
    AND cardinality(tags) <= 5
  ),
  CONSTRAINT visit_closures_note_length
    CHECK (note IS NULL OR char_length(note) BETWEEN 1 AND 300)
);

ALTER TABLE public.visit_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_closures FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.visit_closures FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.visit_closures TO service_role;

-- How a visit stands: closed (attended, no_show), to close (open: held,
-- begun, within 30 days), or nothing to close (null).
CREATE FUNCTION private.closure_state(
  p_status appointment_status,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_outcome public.visit_outcome
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN p_outcome IS NOT NULL THEN p_outcome::text
    WHEN p_status = 'confirmed' AND p_starts_at <= now()
      AND p_ends_at > now() - interval '30 days' THEN 'open'
    ELSE NULL
  END;
$$;

REVOKE ALL ON FUNCTION private.closure_state(appointment_status, timestamptz, timestamptz, public.visit_outcome) FROM PUBLIC, anon, authenticated;

-- May the caller close this visit: an admin, or its own specialist.
CREATE FUNCTION private.may_close_visit(p_visit uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.has_role('admin') OR EXISTS (
    SELECT 1 FROM public.appointments AS visit
    JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
    WHERE visit.id = p_visit AND specialist.user_id = (SELECT auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION private.may_close_visit(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.close_visit(
  p_visit uuid,
  p_outcome public.visit_outcome,
  p_tags text[] DEFAULT '{}',
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments;
BEGIN
  SELECT * INTO v_visit FROM public.appointments WHERE id = p_visit;
  IF v_visit.id IS NULL THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT private.may_close_visit(p_visit) THEN
    RAISE EXCEPTION 'Not your visit' USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF v_visit.status <> 'confirmed' OR lower(v_visit.during) > now() THEN
    RAISE EXCEPTION 'Only a held visit, once begun' USING HINT = 'not_closable';
  END IF;
  BEGIN
    INSERT INTO public.visit_closures AS closure
      (appointment_id, outcome, tags, note, closed_by)
    VALUES (
      p_visit, p_outcome,
      ARRAY(SELECT DISTINCT unnest(coalesce(p_tags, '{}'))),
      nullif(btrim(p_note), ''),
      (SELECT auth.uid())
    )
    ON CONFLICT (appointment_id) DO UPDATE
    SET outcome = EXCLUDED.outcome, tags = EXCLUDED.tags, note = EXCLUDED.note,
      closed_by = EXCLUDED.closed_by, updated_at = now();
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'Tags or note not valid' USING HINT = 'invalid';
  END;
  -- The reminder about it is done with.
  UPDATE public.notifications SET read_at = coalesce(read_at, now())
  WHERE appointment_id = p_visit AND kind = 'visit_to_close';
END;
$$;

REVOKE ALL ON FUNCTION public.close_visit(uuid, public.visit_outcome, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_visit(uuid, public.visit_outcome, text[], text) TO authenticated;

-- The visit's closing, for its panel (who closed it, when).
CREATE FUNCTION public.get_visit_closure(p_visit uuid)
RETURNS TABLE (outcome public.visit_outcome, tags text[], note text,
  closed_at timestamptz, closed_by_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT closure.outcome, closure.tags, closure.note, closure.updated_at,
    nullif(btrim(concat_ws(' ', profile.first_name, profile.last_name)), '')
  FROM public.visit_closures AS closure
  LEFT JOIN public.profiles AS profile ON profile.id = closure.closed_by
  WHERE closure.appointment_id = p_visit
    AND private.may_close_visit(p_visit);
$$;

REVOKE ALL ON FUNCTION public.get_visit_closure(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_closure(uuid) TO authenticated;

-- The backlog: visits to close per specialist (the admin's dashboard; a
-- specialist sees only their own).
CREATE FUNCTION public.unclosed_visits_summary()
RETURNS TABLE (specialist_id uuid, specialist_name text, visits integer,
  oldest_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT visit.specialist_id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    count(*)::integer, min(lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.visit_closures AS closure ON closure.appointment_id = visit.id
  WHERE closure.appointment_id IS NULL
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND (public.has_role('admin') OR specialist.user_id = (SELECT auth.uid()))
  GROUP BY visit.specialist_id, profile.display_name
  ORDER BY count(*) DESC;
$$;

REVOKE ALL ON FUNCTION public.unclosed_visits_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unclosed_visits_summary() TO authenticated;

-- The specialist hears of a visit to close once it has ended (in their
-- portal's panel): one notification a visit, from the last day only.
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
    'booked', 'reserved', 'centre_booked', 'paid',
    'cancelled', 'rescheduled', 'refunded',
    'profile_submitted', 'profile_approved', 'profile_rejected',
    'visit_to_close'
  ));

CREATE FUNCTION private.notify_visits_to_close()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT specialist.user_id, 'specialist', visit.id, 'visit_to_close', 'system',
    jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during),
      'mode', visit.mode
    )
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN public.services AS service ON service.id = visit.service_id
  WHERE visit.status = 'confirmed'
    AND upper(visit.during) <= now()
    AND upper(visit.during) > now() - interval '1 day'
    AND specialist.active
    AND NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications AS sent
      WHERE sent.appointment_id = visit.id AND sent.kind = 'visit_to_close'
    );
END;
$$;

REVOKE ALL ON FUNCTION private.notify_visits_to_close() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('notify-visits-to-close', '*/15 * * * *', 'SELECT private.notify_visits_to_close()');

-- The morning e-mail (the site sends it): each active specialist with
-- visits to close, their address and the visits.
CREATE FUNCTION public.visits_to_close_by_specialist()
RETURNS TABLE (specialist_id uuid, specialist_name text, email text,
  visits jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT specialist.id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    account.email::text,
    jsonb_agg(jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during)
    ) ORDER BY lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN auth.users AS account ON account.id = specialist.user_id
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  WHERE specialist.active
    AND NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND upper(visit.during) <= now()
  GROUP BY specialist.id, profile.display_name, account.email;
$$;

REVOKE ALL ON FUNCTION public.visits_to_close_by_specialist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visits_to_close_by_specialist() TO service_role;

CREATE FUNCTION private.request_closing_emails()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'site_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/zamkniecia',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
END;
$$;

REVOKE ALL ON FUNCTION private.request_closing_emails() FROM PUBLIC, anon, authenticated;

-- 6:00 UTC: 7:00 or 8:00 in Poland.
SELECT cron.schedule('closing-emails', '0 6 * * *', 'SELECT private.request_closing_emails()');

-- Removing a client's details (RODO) takes the closing notes of their
-- visits too (the outcome and tags stay with the visit).
CREATE OR REPLACE FUNCTION private.forget_client_data(p_client uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  placeholder text := 'usuniety-' || left(replace(p_client::text, '-', ''), 12) || '@anonim.invalid';
BEGIN
  UPDATE public.clients
  SET name = 'Klient usunięty',
    email = placeholder,
    phone = NULL,
    notes = NULL,
    forgotten_at = now()
  WHERE id = p_client;

  UPDATE public.notifications AS notification
  SET details = notification.details || jsonb_build_object('client_name', 'Klient usunięty')
  WHERE notification.details ? 'client_name'
    AND notification.appointment_id IN (
      SELECT id FROM public.appointments WHERE client_id = p_client
    );

  DELETE FROM public.visit_intakes
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.visit_closures SET note = NULL
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.appointments
  SET client_name = 'Klient usunięty',
    client_email = placeholder,
    client_phone = NULL,
    client_notes = NULL
  WHERE client_id = p_client;
END;
$$;

-- The bookings table: each visit's closing, and a filter by it.
DROP FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean, boolean, uuid);

CREATE FUNCTION public.search_bookings(p_query text DEFAULT NULL::text, p_statuses text[] DEFAULT NULL::text[], p_payments text[] DEFAULT NULL::text[], p_specialist_ids uuid[] DEFAULT NULL::uuid[], p_service_ids uuid[] DEFAULT NULL::uuid[], p_room_ids uuid[] DEFAULT NULL::uuid[], p_online boolean DEFAULT NULL::boolean, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_created_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_changed_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_changed_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_sort text DEFAULT 'starts_at'::text, p_desc boolean DEFAULT false, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0, p_own boolean DEFAULT false, p_archived boolean DEFAULT NULL::boolean, p_client_id uuid DEFAULT NULL::uuid, p_closure text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_id uuid, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, changed_at timestamp with time zone, archived boolean, closure text, total_count bigint)
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
  IF p_closure IS NOT NULL AND p_closure NOT IN ('open', 'attended', 'no_show') THEN
    RAISE EXCEPTION 'Invalid closure filter' USING ERRCODE = 'invalid_parameter_value';
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
    private.closure_state(v.status, v.starts_at, v.ends_at, closed.outcome) AS closure,
    count(*) OVER () AS total_count
  FROM private.visible_visits(p_own) AS v
  -- The last change: any event but an e-mail or a payment begun.
  LEFT JOIN LATERAL (
    SELECT max(event.occurred_at) AS at
    FROM public.appointment_events AS event
    WHERE event.appointment_id = v.id
      AND event.kind NOT IN ('email_sent', 'payment_started')
  ) AS changed ON true
  LEFT JOIN public.visit_closures AS closed ON closed.appointment_id = v.id
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
    AND (p_client_id IS NULL OR v.client_id = p_client_id)
    AND (p_closure IS NULL
      OR private.closure_state(v.status, v.starts_at, v.ends_at, closed.outcome) = p_closure)
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

REVOKE ALL ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean, boolean, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_bookings(text, text[], text[], uuid[], uuid[], uuid[], boolean, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, boolean, integer, integer, boolean, boolean, uuid, text) TO authenticated, service_role;

