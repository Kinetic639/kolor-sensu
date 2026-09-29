-- Visits and payments (docs/product/booking-plan.md, RD2).
--
-- Free times are worked out here, in one place, from the specialist's
-- availability, time off, room closures and other visits; the booking
-- wizard lists them and a hold re-checks them. Visits of a specialist (and
-- of a room) never overlap, with the break after each, even when two
-- clients take the same time at once. An unpaid hold stops counting when it
-- expires; the next hold marks it expired (no scheduler needed).
--
-- The public only lists free times. Holding and everything after it goes
-- through the site's server (service role), which rate-limits guests.

-- A 60-minute grid with 10 minutes between visits: 50-minute visits every
-- hour (15 minutes left every other hour empty).
ALTER TABLE public.center_settings
  ADD COLUMN slot_step_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN hold_minutes integer NOT NULL DEFAULT 10,
  ADD CONSTRAINT center_settings_slot_step_valid CHECK (slot_step_minutes IN (15, 20, 30, 60)),
  ADD CONSTRAINT center_settings_hold_minutes_range CHECK (hold_minutes BETWEEN 5 AND 30),
  ALTER COLUMN default_visit_buffer_minutes SET DEFAULT 10;

UPDATE public.center_settings
SET default_visit_buffer_minutes = 10
WHERE default_visit_buffer_minutes = 15;

CREATE TYPE public.visit_mode AS ENUM ('in_person', 'online');
CREATE TYPE public.appointment_status AS ENUM (
  'held', 'awaiting_payment', 'confirmed', 'cancelled', 'expired'
);
CREATE TYPE public.payment_status AS ENUM (
  'pending', 'succeeded', 'failed', 'expired', 'refunded', 'partially_refunded'
);

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- For people: `KS-20261005-7843`.
  reference text NOT NULL UNIQUE,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  specialist_service_id uuid NOT NULL REFERENCES public.specialist_services (id) ON DELETE RESTRICT,
  -- The window it was booked in (gone if the window is deleted).
  availability_rule_id uuid REFERENCES public.specialist_availability_rules (id) ON DELETE SET NULL,
  mode public.visit_mode NOT NULL,
  -- In person: the room of the window.
  room_id uuid REFERENCES public.rooms (id) ON DELETE RESTRICT,
  during tstzrange NOT NULL,
  -- The break after it, and the time it keeps from other visits
  -- (`during` plus the break; set by a trigger).
  buffer_minutes integer NOT NULL,
  blocks tstzrange NOT NULL,
  -- What was booked, as it was then.
  duration_minutes integer NOT NULL,
  price_minor integer NOT NULL,
  currency_code text NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'held',
  hold_expires_at timestamptz,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  -- The guest's link (and the hold's cookie) carry the token; only its
  -- SHA-256 is kept.
  access_token_hash bytea NOT NULL UNIQUE,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_during_bounded CHECK (
    NOT isempty(during)
    AND NOT lower_inf(during) AND NOT upper_inf(during)
    AND lower_inc(during) AND NOT upper_inc(during)
  ),
  CONSTRAINT appointments_room_when_in_person CHECK ((mode = 'in_person') = (room_id IS NOT NULL)),
  CONSTRAINT appointments_duration_range CHECK (duration_minutes BETWEEN 5 AND 480),
  CONSTRAINT appointments_buffer_range CHECK (buffer_minutes BETWEEN 0 AND 240),
  CONSTRAINT appointments_price_valid CHECK (price_minor >= 0),
  CONSTRAINT appointments_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT appointments_hold_expires CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
  CONSTRAINT appointments_client_when_booked CHECK (
    status NOT IN ('awaiting_payment', 'confirmed')
    OR (
      client_name IS NOT NULL AND client_email IS NOT NULL
      AND terms_accepted_at IS NOT NULL AND privacy_accepted_at IS NOT NULL
    )
  ),
  CONSTRAINT appointments_client_lengths CHECK (
    (client_name IS NULL OR char_length(client_name) BETWEEN 1 AND 200)
    AND (client_email IS NULL OR (char_length(client_email) <= 320 AND client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    AND (client_phone IS NULL OR char_length(client_phone) BETWEEN 3 AND 40)
    AND (client_notes IS NULL OR char_length(client_notes) <= 1000)
  ),
  CONSTRAINT appointments_cancelled_by_valid CHECK (
    cancelled_by IS NULL OR cancelled_by IN ('client', 'centre')
  ),
  -- No two live visits of a specialist, or in a room, closer than the break.
  CONSTRAINT appointments_specialist_no_overlap EXCLUDE USING gist (
    specialist_id WITH =, blocks WITH &&
  ) WHERE (status IN ('held', 'awaiting_payment', 'confirmed')),
  CONSTRAINT appointments_room_no_overlap EXCLUDE USING gist (
    room_id WITH =, blocks WITH &&
  ) WHERE (room_id IS NOT NULL AND status IN ('held', 'awaiting_payment', 'confirmed'))
);

CREATE INDEX appointments_specialist_start_idx ON public.appointments (specialist_id, lower(during));
CREATE INDEX appointments_service_idx ON public.appointments (service_id);
CREATE INDEX appointments_offer_idx ON public.appointments (specialist_service_id);
CREATE INDEX appointments_rule_idx ON public.appointments (availability_rule_id)
WHERE availability_rule_id IS NOT NULL;
CREATE INDEX appointments_held_idx ON public.appointments (hold_expires_at)
WHERE status = 'held';

CREATE FUNCTION private.set_appointment_blocks()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.blocks := tstzrange(
    lower(NEW.during),
    upper(NEW.during) + make_interval(mins => NEW.buffer_minutes)
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.set_appointment_blocks() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_set_blocks
BEFORE INSERT OR UPDATE OF during, buffer_minutes ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.set_appointment_blocks();

CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointments FROM PUBLIC, anon, authenticated;
-- Everything but the token hash; changes only through functions.
GRANT SELECT (
  id, reference, specialist_id, service_id, specialist_service_id,
  availability_rule_id, mode, room_id, during, buffer_minutes, blocks,
  duration_minutes, price_minor, currency_code, status, hold_expires_at,
  client_name, client_email, client_phone, client_notes, terms_accepted_at,
  privacy_accepted_at, confirmed_at, cancelled_at, cancelled_by, created_at,
  updated_at
) ON public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO service_role;

CREATE POLICY "Specialists read their visits, admins all"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR specialist_id IN (
    SELECT specialists.id FROM public.specialists
    WHERE specialists.user_id = (SELECT auth.uid())
  )
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE RESTRICT,
  checkout_session_id text NOT NULL UNIQUE,
  payment_intent_id text UNIQUE,
  amount_minor integer NOT NULL,
  currency_code text NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  refunded_minor integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_valid CHECK (amount_minor >= 0),
  CONSTRAINT payments_refund_valid CHECK (refunded_minor BETWEEN 0 AND amount_minor),
  CONSTRAINT payments_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT payments_stripe_ids CHECK (
    checkout_session_id ~ '^cs_' AND (payment_intent_id IS NULL OR payment_intent_id ~ '^pi_')
  )
);

CREATE INDEX payments_appointment_idx ON public.payments (appointment_id);

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO service_role;

CREATE POLICY "Admins read payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

-- Stripe events already handled (the webhook is idempotent).
CREATE TABLE public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.stripe_events TO service_role;

-- A visit that still takes its time: booked, or held and not expired.
CREATE FUNCTION private.appointment_is_live(
  p_status public.appointment_status,
  p_hold_expires_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT p_status IN ('awaiting_payment', 'confirmed')
    OR (p_status = 'held' AND p_hold_expires_at > now());
$$;
REVOKE ALL ON FUNCTION private.appointment_is_live(public.appointment_status, timestamptz)
FROM PUBLIC, anon, authenticated;

-- The offer a client can book: the service with this specialist, in this
-- form, everything on and published, bookings open. Null otherwise.
CREATE FUNCTION private.bookable_offer(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT offer.id
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  JOIN public.profiles AS account ON account.id = specialist.user_id
  JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  JOIN public.center_settings AS centre ON centre.id = 1
  WHERE service.slug = p_service_slug
    AND specialist.public_slug = p_specialist_slug
    AND centre.booking_enabled
    AND service.active AND service.publicly_visible AND service.booking_enabled
    AND offer.active AND offer.accepting_new_clients
    AND specialist.active AND account.active
    AND profile.publication_status = 'published'
    AND CASE p_mode
      WHEN 'online' THEN offer.supports_online
      ELSE offer.supports_in_person
    END;
$$;
REVOKE ALL ON FUNCTION private.bookable_offer(text, text, public.visit_mode)
FROM PUBLIC, anon, authenticated;

-- The free times of an offer, day by day: on the centre's grid (every
-- `slot_step_minutes` from local midnight), inside one availability window
-- of the form (a hybrid window serves both), after the notice and within
-- the horizon, clear of time off, of room closures (for windows in a room)
-- and of live visits with the break. In person: only in a location, if
-- given. `room_id`: the visit's room (null online).
CREATE FUNCTION private.free_slots(
  p_offer_id uuid,
  p_mode public.visit_mode,
  p_from date,
  p_to date,
  p_location_id uuid DEFAULT NULL
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz, rule_id uuid, room_id uuid)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH settings AS (
    SELECT timezone AS tz,
      slot_step_minutes AS step,
      default_visit_buffer_minutes AS buffer,
      min_booking_lead_minutes AS lead,
      max_booking_horizon_days AS horizon
    FROM public.center_settings
    WHERE id = 1
  ),
  offer AS (
    SELECT o.specialist_id,
      coalesce(o.duration_minutes, s.default_duration_minutes) AS duration
    FROM public.specialist_services AS o
    JOIN public.services AS s ON s.id = o.service_id
    WHERE o.id = p_offer_id
  ),
  windows AS (
    SELECT r.id AS rule_id, r.room_id AS window_room, d::date AS day,
      r.starts_at AS window_start, r.ends_at AS window_end
    FROM offer
    JOIN public.specialist_availability_rules AS r ON r.specialist_id = offer.specialist_id
    CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d
    LEFT JOIN public.rooms AS room ON room.id = r.room_id
    LEFT JOIN public.locations AS location ON location.id = room.location_id
    WHERE private.availability_rule_on(r.id, d::date)
      AND CASE p_mode
        WHEN 'online' THEN r.mode IN ('online', 'hybrid')
        ELSE r.mode IN ('in_person', 'hybrid')
      END
      AND (
        r.room_id IS NULL
        OR (
          room.active AND location.active
          AND NOT EXISTS (
            SELECT 1 FROM public.room_availability_exceptions AS closed
            WHERE closed.room_id = r.room_id
              AND closed.date = d::date
              AND closed.type = 'closed_all_day'
          )
        )
      )
      AND (p_mode = 'online' OR p_location_id IS NULL OR room.location_id = p_location_id)
  ),
  candidates AS (
    SELECT w.rule_id, w.window_room, w.day,
      ((w.day + make_interval(mins => m)) AT TIME ZONE settings.tz) AS slot_start,
      ((w.day + make_interval(mins => m + offer.duration)) AT TIME ZONE settings.tz) AS slot_end
    FROM windows AS w
    CROSS JOIN settings
    CROSS JOIN offer
    CROSS JOIN generate_series(
      (ceil(extract(epoch FROM w.window_start) / 60 / settings.step) * settings.step)::integer,
      (extract(epoch FROM w.window_end) / 60)::integer - offer.duration,
      settings.step
    ) AS m
  )
  SELECT c.slot_start, c.slot_end, c.rule_id,
    CASE WHEN p_mode = 'in_person' THEN c.window_room END
  FROM candidates AS c
  CROSS JOIN settings
  CROSS JOIN offer
  WHERE c.slot_start >= now() + make_interval(mins => settings.lead)
    AND c.slot_start <= now() + make_interval(days => settings.horizon)
    AND NOT EXISTS (
      SELECT 1 FROM public.specialist_time_off AS off
      WHERE off.specialist_id = offer.specialist_id
        AND off.during && tstzrange(c.slot_start, c.slot_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS blocked
      WHERE blocked.room_id = c.window_room
        AND blocked.date = c.day
        AND blocked.type = 'blocked_interval'
        AND tstzrange(
          (blocked.date + blocked.starts_at) AT TIME ZONE settings.tz,
          (blocked.date + blocked.ends_at) AT TIME ZONE settings.tz
        ) && tstzrange(c.slot_start, c.slot_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.specialist_id = offer.specialist_id
        AND private.appointment_is_live(visit.status, visit.hold_expires_at)
        AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
    )
    AND (
      p_mode = 'online'
      OR NOT EXISTS (
        SELECT 1 FROM public.appointments AS visit
        WHERE visit.room_id = c.window_room
          AND private.appointment_is_live(visit.status, visit.hold_expires_at)
          AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
      )
    );
$$;
REVOKE ALL ON FUNCTION private.free_slots(uuid, public.visit_mode, date, date, uuid)
FROM PUBLIC, anon, authenticated;

-- A published location by its slug; null when there is none.
CREATE FUNCTION private.public_location_id(p_slug text)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT id FROM public.locations
  WHERE slug = p_slug AND active AND publicly_visible;
$$;
REVOKE ALL ON FUNCTION private.public_location_id(text) FROM PUBLIC, anon, authenticated;

-- The free times of a service with a specialist, in a form (and a
-- location), for up to two weeks: when visits start and end, nothing else.
CREATE FUNCTION public.list_free_slots(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode,
  p_from date,
  p_to date,
  p_location_slug text DEFAULT NULL
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_location uuid;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 13 THEN
    RAISE EXCEPTION 'A range of one to 14 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN RETURN; END IF;
  END IF;

  RETURN QUERY
  SELECT slot.starts_at, slot.ends_at
  FROM private.free_slots(
    private.bookable_offer(p_service_slug, p_specialist_slug, p_mode),
    p_mode, p_from, p_to, v_location
  ) AS slot
  ORDER BY slot.starts_at;
END;
$$;

-- Holds a free time for `hold_minutes` while the client fills in their
-- details and pays. Re-checks everything; returns the visit's token (the
-- only time it exists outside the database).
CREATE FUNCTION public.hold_slot(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode,
  p_starts_at timestamptz,
  p_location_slug text DEFAULT NULL
)
RETURNS TABLE (
  appointment_id uuid,
  reference text,
  access_token text,
  hold_expires_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
  v_token text;
  v_reference text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  SELECT * INTO v_offer FROM public.specialist_services
  WHERE id = private.bookable_offer(p_service_slug, p_specialist_slug, p_mode);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service cannot be booked with this specialist'
      USING HINT = 'not_bookable';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN
      RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
    END IF;
  END IF;

  -- One hold at a time per specialist; the constraints guard rooms too.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));

  -- Holds left to expire give their time back.
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();

  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(v_offer.id, p_mode, v_day, v_day, v_location) AS slot
  WHERE slot.starts_at = p_starts_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  -- 32 random bytes, URL-safe.
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  LOOP
    v_reference := 'KS-' || to_char(v_day, 'YYYYMMDD') || '-'
      || lpad(floor(random() * 10000)::integer::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.appointments AS existing WHERE existing.reference = v_reference
    );
  END LOOP;
  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      availability_rule_id, mode, room_id, during, buffer_minutes,
      duration_minutes, price_minor, currency_code, status, hold_expires_at,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      v_slot.rule_id, p_mode, v_slot.room_id,
      tstzrange(v_slot.starts_at, v_slot.ends_at),
      v_settings.default_visit_buffer_minutes,
      (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
      v_offer.price_minor, v_offer.currency_code, 'held', v_expires,
      extensions.digest(v_token, 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  RETURN QUERY SELECT v_id, v_reference, v_token, v_expires;
END;
$$;

-- Gives a held time back (the client changed their mind or the time).
CREATE FUNCTION public.release_hold(p_access_token text)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client'
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held';
  RETURN FOUND;
END;
$$;

-- A guest's visit, by its token: what they booked, where and when.
CREATE FUNCTION public.get_booking(p_access_token text)
RETURNS TABLE (
  reference text,
  status public.appointment_status,
  mode public.visit_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_expires_at timestamptz,
  service_name text,
  specialist_name text,
  room_name text,
  location_name text,
  price_minor integer,
  currency_code text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during), visit.hold_expires_at,
    service.name, profile.display_name, room.name, location.name,
    visit.price_minor, visit.currency_code
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

REVOKE ALL ON FUNCTION public.list_free_slots(text, text, public.visit_mode, date, date, text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_free_slots(text, text, public.visit_mode, date, date, text)
TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.hold_slot(text, text, public.visit_mode, timestamptz, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_slot(text, text, public.visit_mode, timestamptz, text)
TO service_role;

REVOKE ALL ON FUNCTION public.release_hold(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_hold(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_booking(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking(text) TO service_role;
