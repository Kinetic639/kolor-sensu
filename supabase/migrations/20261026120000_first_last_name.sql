-- A person's first and last name apart (the owner's decision of 25.10):
-- clients, visits and workshop seats keep the whole name ("Anna Nowak",
-- read as before by every e-mail, notification and view) and now also its
-- two parts, so the portals sort and search by the last name.
--
-- One trigger keeps the three in step on each table: parts written make
-- the whole name; a whole name written alone (an older path, a client's
-- card copied from a visit, anonymising) is split, by the parts the write
-- functions remember for the transaction when they match, else at its last
-- space ("Anna Maria Nowak": "Anna Maria", "Nowak"). The names already
-- kept are split so. The seven write functions take the parts; their
-- older signatures stay, splitting the whole name, so their callers and
-- the tests keep working.

-- ------------------------------------------------------------ helpers

-- "Anna" + "Nowak": "Anna Nowak"; null when neither is given.
CREATE FUNCTION private.full_name(p_first text, p_last text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT nullif(btrim(concat_ws(' ', nullif(btrim(p_first), ''), nullif(btrim(p_last), ''))), '');
$$;

-- "Anna Maria Nowak": "Anna Maria"; one word: itself.
CREATE FUNCTION private.name_first(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE WHEN btrim(p_name) ~ '\s'
    THEN regexp_replace(btrim(p_name), '\s+\S+$', '')
    ELSE nullif(btrim(p_name), '') END;
$$;

-- "Anna Maria Nowak": "Nowak"; one word: null.
CREATE FUNCTION private.name_last(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE WHEN btrim(p_name) ~ '\s' THEN substring(btrim(p_name) from '\S+$') END;
$$;

-- The parts a write function was given, for the triggers of the rows it
-- writes in this transaction (a visit, then the client's card it makes).
CREATE FUNCTION private.remember_name_parts(p_first text, p_last text)
RETURNS void
LANGUAGE sql
SET search_path TO ''
AS $$
  SELECT set_config('kolor_sensu.name_parts',
    jsonb_build_object('first', nullif(btrim(p_first), ''), 'last', nullif(btrim(p_last), ''))::text,
    true);
$$;

-- The trigger: TG_ARGV are the whole name's column and the two parts'.
CREATE FUNCTION private.sync_name_parts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  c_name text := TG_ARGV[0];
  c_first text := TG_ARGV[1];
  c_last text := TG_ARGV[2];
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END;
  v_name text := v_new ->> c_name;
  v_first text := v_new ->> c_first;
  v_last text := v_new ->> c_last;
  v_parts_changed boolean;
  v_name_changed boolean;
  v_memory jsonb;
BEGIN
  v_parts_changed := CASE WHEN TG_OP = 'INSERT'
    THEN v_first IS NOT NULL OR v_last IS NOT NULL
    ELSE v_first IS DISTINCT FROM v_old ->> c_first OR v_last IS DISTINCT FROM v_old ->> c_last
  END;
  v_name_changed := TG_OP = 'INSERT' OR v_name IS DISTINCT FROM v_old ->> c_name;

  IF v_parts_changed AND private.full_name(v_first, v_last) IS NOT NULL THEN
    v_name := private.full_name(v_first, v_last);
  ELSIF v_name_changed THEN
    v_memory := nullif(current_setting('kolor_sensu.name_parts', true), '')::jsonb;
    IF v_memory IS NOT NULL
       AND private.full_name(v_memory ->> 'first', v_memory ->> 'last') = btrim(v_name) THEN
      v_first := v_memory ->> 'first';
      v_last := v_memory ->> 'last';
    ELSE
      v_first := private.name_first(v_name);
      v_last := private.name_last(v_name);
    END IF;
  END IF;

  NEW := jsonb_populate_record(NEW,
    jsonb_build_object(c_name, v_name, c_first, v_first, c_last, v_last));
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.full_name(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.name_first(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.name_last(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.remember_name_parts(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_name_parts() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------ the columns

ALTER TABLE public.clients
  ADD COLUMN first_name text CHECK (first_name IS NULL OR char_length(first_name) <= 200),
  ADD COLUMN last_name text CHECK (last_name IS NULL OR char_length(last_name) <= 200);
ALTER TABLE public.appointments
  ADD COLUMN client_first_name text CHECK (client_first_name IS NULL OR char_length(client_first_name) <= 200),
  ADD COLUMN client_last_name text CHECK (client_last_name IS NULL OR char_length(client_last_name) <= 200);
ALTER TABLE public.workshop_registrations
  ADD COLUMN client_first_name text CHECK (client_first_name IS NULL OR char_length(client_first_name) <= 200),
  ADD COLUMN client_last_name text CHECK (client_last_name IS NULL OR char_length(client_last_name) <= 200);

-- The names kept so far, split at their last space.
UPDATE public.clients
SET first_name = private.name_first(name), last_name = private.name_last(name);
UPDATE public.appointments
SET client_first_name = private.name_first(client_name), client_last_name = private.name_last(client_name)
WHERE client_name IS NOT NULL;
UPDATE public.workshop_registrations
SET client_first_name = private.name_first(client_name), client_last_name = private.name_last(client_name)
WHERE client_name IS NOT NULL;

CREATE TRIGGER clients_name_parts
  BEFORE INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION private.sync_name_parts('name', 'first_name', 'last_name');
CREATE TRIGGER appointments_name_parts
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION private.sync_name_parts('client_name', 'client_first_name', 'client_last_name');
CREATE TRIGGER workshop_registrations_name_parts
  BEFORE INSERT OR UPDATE ON public.workshop_registrations
  FOR EACH ROW EXECUTE FUNCTION private.sync_name_parts('client_name', 'client_first_name', 'client_last_name');

-- The last name sorts the client lists.
CREATE INDEX clients_last_name_idx ON public.clients (lower(last_name), lower(first_name));

GRANT SELECT (client_first_name, client_last_name) ON public.appointments TO authenticated;
GRANT SELECT (client_first_name, client_last_name) ON public.workshop_registrations TO authenticated;

-- ------------------------------------------------------------ writing

-- save_booking_details: the body of 20261006120000_baseline, with the name in its parts.
CREATE FUNCTION "public"."save_booking_details"("p_access_token" "text", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text", "p_accept_terms" boolean, "p_accept_privacy" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_id uuid;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  IF p_accept_terms IS NOT TRUE OR p_accept_privacy IS NOT TRUE THEN
    RAISE EXCEPTION 'Both consents are required' USING HINT = 'consent_required';
  END IF;

  SELECT id INTO v_id FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held' AND hold_expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET client_name = nullif(trim(p_name), ''),
        client_email = lower(nullif(trim(p_email), '')),
        client_phone = nullif(trim(p_phone), ''),
        client_notes = nullif(trim(p_notes), ''),
        terms_accepted_at = now(),
        privacy_accepted_at = now()
    WHERE id = v_id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL OR client_phone IS NULL
      FROM public.appointments WHERE id = v_id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;

-- centre_book_visit: the body of 20261013090000_centre_visits_within_room_hours, with the name in its parts.
CREATE FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_first_name" "text", "p_client_last_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") RETURNS TABLE("appointment_id" "uuid", "reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  p_client_name text := private.full_name(p_client_first_name, p_client_last_name);
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_duration integer;
  v_during tstzrange;
  v_day date;
  v_room public.rooms%ROWTYPE;
  v_reference text;
  v_due timestamptz;
  v_id uuid;
BEGIN
  PERFORM private.remember_name_parts(p_client_first_name, p_client_last_name);
  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = p_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such offer' USING HINT = 'not_bookable';
  END IF;
  PERFORM private.managed_specialist_id(v_offer.specialist_id);

  IF NOT v_offer.active
     OR NOT EXISTS (
       SELECT 1 FROM public.specialists AS specialist
       WHERE specialist.id = v_offer.specialist_id AND specialist.active
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.services AS service
       WHERE service.id = v_offer.service_id AND service.active
     )
     OR (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service cannot be booked this way' USING HINT = 'not_bookable';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  -- Paid by the usual time before the visit, or soon when it is close.
  v_due := coalesce(
    private.payment_due(p_starts_at),
    least(
      now() + make_interval(hours => v_settings.centre_payment_link_hours),
      p_starts_at - interval '1 hour'
    )
  );
  IF v_due <= now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Too little time left to pay' USING HINT = 'too_soon';
  END IF;

  SELECT coalesce(v_offer.duration_minutes, service.default_duration_minutes)
  INTO v_duration FROM public.services AS service WHERE service.id = v_offer.service_id;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_duration));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF p_mode = 'in_person' THEN
    SELECT * INTO v_room FROM public.rooms AS room WHERE room.id = p_room_id;
    IF NOT FOUND OR NOT v_room.active OR NOT EXISTS (
      SELECT 1 FROM public.locations AS location
      WHERE location.id = v_room.location_id AND location.active
    ) THEN
      RAISE EXCEPTION 'Choose an open room' USING HINT = 'room_required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS closed
      WHERE closed.room_id = v_room.id
        AND closed.date = v_day
        AND (
          closed.type = 'closed_all_day'
          OR (
            closed.type = 'blocked_interval'
            AND tstzrange(
              (closed.date + closed.starts_at) AT TIME ZONE v_settings.timezone,
              (closed.date + closed.ends_at) AT TIME ZONE v_settings.timezone
            ) && v_during
          )
        )
    ) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
    -- Open then, by its hours (#33).
    IF NOT private.room_open_during(v_room.id, v_during, v_settings.timezone) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_offer.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      mode, room_id, during, buffer_minutes, duration_minutes,
      price_minor, currency_code, status, payment_due_at, booked_by,
      client_name, client_email, client_phone, client_notes,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      p_mode, CASE WHEN p_mode = 'in_person' THEN v_room.id END,
      v_during, v_settings.default_visit_buffer_minutes, v_duration,
      v_offer.price_minor, v_offer.currency_code, 'awaiting_payment', v_due, 'centre',
      nullif(trim(p_client_name), ''),
      lower(nullif(trim(p_client_email), '')),
      nullif(trim(p_client_phone), ''),
      nullif(trim(p_client_notes), ''),
      extensions.digest(extensions.gen_random_bytes(32), 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN exclusion_violation THEN
      IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
        RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
      END IF;
      RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
    WHEN check_violation THEN
      RAISE EXCEPTION 'The client''s details are not valid' USING HINT = 'invalid_details';
  END;

  RETURN QUERY SELECT v_id, v_reference, lower(v_during), upper(v_during), v_due;
END;
$$;

-- admin_update_client: the body of 20261006120000_baseline, with the name in its parts.
CREATE FUNCTION "public"."admin_update_client"("p_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_email" "text", "p_phone" "text", "p_notes" "text") RETURNS TABLE("id" "uuid", "upcoming_updated" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_name text := nullif(btrim(p_name), '');
  v_email text := lower(nullif(btrim(p_email), ''));
  v_phone text := nullif(btrim(p_phone), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_count integer;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
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
$$;

-- save_workshop_registration_details: the body of 20261023080000_workshop_registrations, with the name in its parts.
CREATE FUNCTION public.save_workshop_registration_details(
  p_access_token text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR NOT (
    (v_registration.status = 'held' AND v_registration.hold_expires_at > now())
    OR (v_registration.status = 'offered' AND v_registration.offer_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF NOT coalesce(p_accept_terms, false) OR NOT coalesce(p_accept_privacy, false) THEN
    RAISE EXCEPTION 'The terms and the privacy policy must be accepted'
      USING HINT = 'consent_required';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);

  BEGIN
    UPDATE public.workshop_registrations
    SET client_name = nullif(btrim(p_name), ''),
        client_email = lower(nullif(btrim(p_email), '')),
        client_phone = nullif(btrim(p_phone), ''),
        client_notes = nullif(btrim(p_notes), ''),
        terms_accepted_at = coalesce(terms_accepted_at, now()),
        privacy_accepted_at = coalesce(privacy_accepted_at, now())
    WHERE id = v_registration.id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL
      FROM public.workshop_registrations WHERE id = v_registration.id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;

-- join_workshop_waitlist: the body of 20261023080000_workshop_registrations, with the name in its parts.
CREATE FUNCTION public.join_workshop_waitlist(
  p_slug text,
  p_client_key text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
RETURNS TABLE (reference text, access_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_workshop public.workshops%ROWTYPE;
  v_token text;
  v_reference text;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  PERFORM private.count_workshop_attempt(p_client_key);
  v_workshop := private.open_workshop(p_slug);
  PERFORM private.expire_workshop_registrations(v_workshop.id);
  IF private.workshop_seats_taken(v_workshop.id) < v_workshop.capacity THEN
    RAISE EXCEPTION 'There are free seats' USING HINT = 'seats_free';
  END IF;
  IF NOT coalesce(p_accept_terms, false) OR NOT coalesce(p_accept_privacy, false) THEN
    RAISE EXCEPTION 'The terms and the privacy policy must be accepted'
      USING HINT = 'consent_required';
  END IF;
  PERFORM private.require_new_participant(v_workshop.id, p_email, NULL);

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reference := 'W' || private.next_booking_reference(
    now(), (SELECT timezone FROM public.center_settings WHERE id = 1)
  );
  BEGIN
    INSERT INTO public.workshop_registrations (
      workshop_id, reference, status, access_token_hash, price_minor,
      currency_code, waitlisted_at, client_name, client_email, client_phone,
      client_notes, terms_accepted_at, privacy_accepted_at
    )
    VALUES (
      v_workshop.id, v_reference, 'waitlisted', extensions.digest(v_token, 'sha256'),
      -- The waitlist's order: the clock, not the transaction's start.
      v_workshop.price_minor, v_workshop.currency_code, clock_timestamp(),
      nullif(btrim(p_name), ''), lower(nullif(btrim(p_email), '')),
      nullif(btrim(p_phone), ''), nullif(btrim(p_notes), ''), now(), now()
    );
  EXCEPTION
    WHEN check_violation OR not_null_violation THEN
      RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Already registered' USING HINT = 'already_registered';
  END;

  RETURN QUERY SELECT v_reference, v_token;
END;
$$;

-- transfer_workshop_seat: the body of 20261023170000_workshop_after_signup, with the name in its parts.
CREATE FUNCTION public.transfer_workshop_seat(
  p_access_token text, p_first_name text, p_last_name text, p_email text, p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR v_registration.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Only a booked seat can be passed on' USING HINT = 'not_transferable';
  END IF;
  IF now() >= (SELECT starts_at FROM public.workshops WHERE id = v_registration.workshop_id) THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);
  BEGIN
    UPDATE public.workshop_registrations
    SET client_name = nullif(btrim(p_name), ''),
        client_email = lower(nullif(btrim(p_email), '')),
        client_phone = nullif(btrim(p_phone), ''),
        client_notes = NULL
    WHERE id = v_registration.id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  DELETE FROM public.workshop_emails
  WHERE registration_id = v_registration.id
    AND kind IN ('confirmation', 'reserved', 'reminder', 'payment_reminder', 'rescheduled');
END;
$$;

-- centre_add_workshop_participant: the body of 20261023170000_workshop_after_signup, with the name in its parts.
CREATE FUNCTION public.centre_add_workshop_participant(
  p_workshop_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_paid_outside boolean
)
RETURNS TABLE (reference text, status public.workshop_registration_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_workshop public.workshops%ROWTYPE;
  v_reference text;
  v_status public.workshop_registration_status;
  v_due timestamptz;
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  PERFORM private.require_workshop_admin();
  SELECT * INTO v_workshop FROM public.workshops WHERE id = p_workshop_id FOR UPDATE;
  IF NOT FOUND OR v_workshop.status <> 'published' OR v_workshop.starts_at <= now() THEN
    RAISE EXCEPTION 'Not open' USING HINT = 'registration_closed';
  END IF;
  PERFORM private.expire_workshop_registrations(p_workshop_id);
  IF private.workshop_seats_taken(p_workshop_id) >= v_workshop.capacity THEN
    RAISE EXCEPTION 'The workshop is full' USING HINT = 'full';
  END IF;
  PERFORM private.require_new_participant(p_workshop_id, p_email, NULL);

  IF coalesce(p_paid_outside, false) OR v_workshop.price_minor = 0 THEN
    v_status := 'confirmed';
  ELSE
    v_status := 'awaiting_payment';
    v_due := greatest(
      v_workshop.starts_at - private.workshop_notice(),
      least(now() + interval '2 days', v_workshop.starts_at)
    );
  END IF;
  v_reference := 'W' || private.next_booking_reference(
    now(), (SELECT timezone FROM public.center_settings WHERE id = 1)
  );
  BEGIN
    INSERT INTO public.workshop_registrations (
      workshop_id, reference, status, booked_by, access_token_hash,
      price_minor, currency_code, paid_outside, payment_due_at, confirmed_at,
      client_name, client_email, client_phone, client_notes
    )
    VALUES (
      p_workshop_id, v_reference, v_status, 'centre',
      extensions.digest(extensions.gen_random_bytes(32), 'sha256'),
      v_workshop.price_minor, v_workshop.currency_code,
      coalesce(p_paid_outside, false) AND v_workshop.price_minor > 0,
      v_due, CASE WHEN v_status = 'confirmed' THEN now() END,
      nullif(btrim(p_name), ''), lower(nullif(btrim(p_email), '')),
      nullif(btrim(p_phone), ''), nullif(btrim(p_notes), '')
    );
  EXCEPTION
    WHEN check_violation OR not_null_violation THEN
      RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Already registered' USING HINT = 'already_registered';
  END;
  RETURN QUERY SELECT v_reference, v_status;
END;
$$;

-- ------------------------------------------------------------ the older signatures

-- Each splits the whole name it is given and writes through the new one.
CREATE OR REPLACE FUNCTION public.save_booking_details(
  p_access_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_accept_terms boolean, p_accept_privacy boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.save_booking_details(p_access_token, private.name_first(p_name), private.name_last(p_name),
    p_email, p_phone, p_notes, p_accept_terms, p_accept_privacy);
$$;

CREATE OR REPLACE FUNCTION public.centre_book_visit(
  p_offer_id uuid, p_mode public.visit_mode, p_starts_at timestamptz, p_room_id uuid,
  p_client_name text, p_client_email text, p_client_phone text, p_client_notes text
)
RETURNS TABLE (appointment_id uuid, reference text, starts_at timestamptz, ends_at timestamptz, payment_due_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.centre_book_visit(p_offer_id, p_mode, p_starts_at, p_room_id,
    private.name_first(p_client_name), private.name_last(p_client_name),
    p_client_email, p_client_phone, p_client_notes);
$$;

CREATE OR REPLACE FUNCTION public.admin_update_client(
  p_id uuid, p_name text, p_email text, p_phone text, p_notes text
)
RETURNS TABLE (id uuid, upcoming_updated integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.admin_update_client(p_id, private.name_first(p_name), private.name_last(p_name),
    p_email, p_phone, p_notes);
$$;

CREATE OR REPLACE FUNCTION public.save_workshop_registration_details(
  p_access_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_accept_terms boolean, p_accept_privacy boolean
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.save_workshop_registration_details(p_access_token,
    private.name_first(p_name), private.name_last(p_name),
    p_email, p_phone, p_notes, p_accept_terms, p_accept_privacy);
$$;

CREATE OR REPLACE FUNCTION public.join_workshop_waitlist(
  p_slug text, p_client_key text, p_name text, p_email text, p_phone text, p_notes text,
  p_accept_terms boolean, p_accept_privacy boolean
)
RETURNS TABLE (reference text, access_token text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.join_workshop_waitlist(p_slug, p_client_key,
    private.name_first(p_name), private.name_last(p_name),
    p_email, p_phone, p_notes, p_accept_terms, p_accept_privacy);
$$;

CREATE OR REPLACE FUNCTION public.transfer_workshop_seat(
  p_access_token text, p_name text, p_email text, p_phone text
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT public.transfer_workshop_seat(p_access_token,
    private.name_first(p_name), private.name_last(p_name), p_email, p_phone);
$$;

CREATE OR REPLACE FUNCTION public.centre_add_workshop_participant(
  p_workshop_id uuid, p_name text, p_email text, p_phone text, p_notes text, p_paid_outside boolean
)
RETURNS TABLE (reference text, status public.workshop_registration_status)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT * FROM public.centre_add_workshop_participant(p_workshop_id,
    private.name_first(p_name), private.name_last(p_name), p_email, p_phone, p_notes, p_paid_outside);
$$;

-- ------------------------------------------------------------ access (the new signatures, as the old)

REVOKE ALL ON FUNCTION public.save_booking_details(text, text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_booking_details(text, text, text, text, text, text, boolean, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_update_client(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_client(uuid, text, text, text, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_workshop_registration_details(text, text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_workshop_registration_details(text, text, text, text, text, text, boolean, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.join_workshop_waitlist(text, text, text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_workshop_waitlist(text, text, text, text, text, text, text, boolean, boolean) TO service_role;
REVOKE ALL ON FUNCTION public.transfer_workshop_seat(text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_workshop_seat(text, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.centre_add_workshop_participant(uuid, text, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_add_workshop_participant(uuid, text, text, text, text, text, boolean) TO authenticated;
