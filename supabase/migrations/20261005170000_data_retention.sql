-- Ustawienia → Dane osobowe (RODO). How long the centre keeps a client's
-- details after their last visit (years; none: until removed by hand),
-- and the answers of the questionnaire before a first consultation after
-- its visit (months: health data, kept the shortest). A nightly job
-- applies both; a client's details are also removed at their request
-- (the client's card), when nothing is open with them.
--
-- Removing keeps the visits (dates, services, prices, payments: the
-- accounts need them) and takes away who they were: the name, e-mail and
-- phone on the client and on every visit and notification, the notes and
-- the questionnaire's answers. A booked or paid visit must keep a name
-- and an address, so they become placeholders.

ALTER TABLE public.center_settings
  ADD COLUMN client_retention_years integer DEFAULT 5,
  ADD COLUMN intake_retention_months integer NOT NULL DEFAULT 12,
  ADD CONSTRAINT center_settings_client_retention_years_range
    CHECK (client_retention_years IS NULL OR client_retention_years BETWEEN 1 AND 20),
  ADD CONSTRAINT center_settings_intake_retention_months_range
    CHECK (intake_retention_months BETWEEN 1 AND 120);

ALTER TABLE public.clients ADD COLUMN forgotten_at timestamptz;

-- Something open with the client: a visit to come (or held), or money
-- still owed back to them.
CREATE FUNCTION private.client_has_open_business(p_client uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.appointments AS visit
    WHERE visit.client_id = p_client
      AND (
        (private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
          AND upper(visit.during) > now())
        OR coalesce(visit.refund_due_minor, 0) > 0
      )
  );
$$;

REVOKE ALL ON FUNCTION private.client_has_open_business(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.forget_client_data(p_client uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  placeholder text := 'usuniety-' || left(replace(p_client::text, '-', ''), 12) || '@anonim.invalid';
BEGIN
  UPDATE public.notifications AS notification
  SET details = notification.details || jsonb_build_object('client_name', 'Klient usunięty')
  WHERE notification.details ? 'client_name'
    AND notification.appointment_id IN (
      SELECT id FROM public.appointments WHERE client_id = p_client
    );

  DELETE FROM public.visit_intakes
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.appointments
  SET client_name = 'Klient usunięty',
    client_email = placeholder,
    client_phone = NULL,
    client_notes = NULL
  WHERE client_id = p_client;

  UPDATE public.clients
  SET name = 'Klient usunięty',
    email = placeholder,
    phone = NULL,
    notes = NULL,
    forgotten_at = now()
  WHERE id = p_client;
END;
$$;

REVOKE ALL ON FUNCTION private.forget_client_data(uuid) FROM PUBLIC, anon, authenticated;

-- At the client's request (the client's card).
CREATE FUNCTION public.forget_client(p_client uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client) THEN
    RAISE EXCEPTION 'No such client.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id = p_client AND forgotten_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Already removed.' USING ERRCODE = 'P0001', HINT = 'already_forgotten';
  END IF;
  IF private.client_has_open_business(p_client) THEN
    RAISE EXCEPTION 'A visit to come or money owed.'
      USING ERRCODE = 'P0001', HINT = 'client_busy';
  END IF;
  PERFORM private.forget_client_data(p_client);
END;
$$;

REVOKE ALL ON FUNCTION public.forget_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forget_client(uuid) TO authenticated;

-- Whose details are past keeping, and which answers.
CREATE FUNCTION private.clients_past_keeping()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT client.id
  FROM public.clients AS client
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND settings.client_retention_years IS NOT NULL
    AND client.forgotten_at IS NULL
    AND client.created_at < now() - make_interval(years => settings.client_retention_years)
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.client_id = client.id
        AND upper(visit.during) >= now() - make_interval(years => settings.client_retention_years)
    )
    AND NOT private.client_has_open_business(client.id);
$$;

REVOKE ALL ON FUNCTION private.clients_past_keeping() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.intakes_past_keeping()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT intake.id
  FROM public.visit_intakes AS intake
  JOIN public.appointments AS visit ON visit.id = intake.appointment_id
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND upper(visit.during) < now() - make_interval(months => settings.intake_retention_months);
$$;

REVOKE ALL ON FUNCTION private.intakes_past_keeping() FROM PUBLIC, anon, authenticated;

-- The nightly job.
CREATE FUNCTION private.apply_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  client_id uuid;
BEGIN
  DELETE FROM public.visit_intakes
  WHERE id IN (SELECT private.intakes_past_keeping());
  FOR client_id IN SELECT private.clients_past_keeping() LOOP
    PERFORM private.forget_client_data(client_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_retention() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('apply-data-retention', '30 2 * * *', 'SELECT private.apply_retention()');

-- What the next night would remove (the settings' figures).
CREATE FUNCTION public.retention_preview()
RETURNS TABLE (clients integer, intakes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*)::integer FROM private.clients_past_keeping()),
    (SELECT count(*)::integer FROM private.intakes_past_keeping())
  WHERE public.has_role('admin');
$$;

REVOKE ALL ON FUNCTION public.retention_preview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retention_preview() TO authenticated;
