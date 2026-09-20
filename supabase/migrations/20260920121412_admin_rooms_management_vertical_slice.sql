-- Complete the Rooms / Resource Domain without introducing specialist
-- availability, appointments, booking, or slot-generation semantics.

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE TYPE public.room_availability_exception_type AS ENUM (
  'closed_all_day',
  'blocked_interval',
  'extra_available_interval'
);

CREATE TABLE public.room_public_profiles (
  room_id uuid PRIMARY KEY REFERENCES public.rooms (id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  short_description text,
  long_description text,
  image_path text,
  accessibility_notes text,
  amenities text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_public_profiles_display_name_length CHECK (
    char_length(display_name) BETWEEN 1 AND 200
  ),
  CONSTRAINT room_public_profiles_short_description_length CHECK (
    short_description IS NULL OR char_length(short_description) <= 500
  ),
  CONSTRAINT room_public_profiles_long_description_length CHECK (
    long_description IS NULL OR char_length(long_description) <= 10000
  ),
  CONSTRAINT room_public_profiles_image_path_length CHECK (
    image_path IS NULL OR char_length(image_path) <= 2048
  ),
  CONSTRAINT room_public_profiles_accessibility_notes_length CHECK (
    accessibility_notes IS NULL OR char_length(accessibility_notes) <= 2000
  ),
  CONSTRAINT room_public_profiles_amenities_count CHECK (
    cardinality(amenities) <= 50 AND array_position(amenities, NULL) IS NULL
  )
);

CREATE TRIGGER set_room_public_profiles_updated_at
BEFORE UPDATE ON public.room_public_profiles
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE public.room_opening_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE RESTRICT,
  weekday smallint NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  time_span int4range GENERATED ALWAYS AS (
    int4range(
      extract(epoch FROM starts_at)::integer,
      extract(epoch FROM ends_at)::integer,
      '[)'
    )
  ) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_opening_hours_weekday_range CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT room_opening_hours_time_order CHECK (starts_at < ends_at),
  CONSTRAINT room_opening_hours_exact_interval_key UNIQUE (
    room_id, weekday, starts_at, ends_at
  ),
  CONSTRAINT room_opening_hours_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    weekday WITH =,
    time_span WITH &&
  )
);

CREATE INDEX room_opening_hours_room_weekday_idx
ON public.room_opening_hours (room_id, weekday, starts_at);

CREATE TRIGGER set_room_opening_hours_updated_at
BEFORE UPDATE ON public.room_opening_hours
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE public.room_availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE RESTRICT,
  date date NOT NULL,
  type public.room_availability_exception_type NOT NULL,
  starts_at time,
  ends_at time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_availability_exceptions_time_shape CHECK (
    (type = 'closed_all_day' AND starts_at IS NULL AND ends_at IS NULL)
    OR
    (
      type IN ('blocked_interval', 'extra_available_interval')
      AND starts_at IS NOT NULL
      AND ends_at IS NOT NULL
      AND starts_at < ends_at
    )
  ),
  CONSTRAINT room_availability_exceptions_reason_length CHECK (
    reason IS NULL OR char_length(reason) <= 500
  ),
  CONSTRAINT room_availability_exceptions_unique
    UNIQUE NULLS NOT DISTINCT (room_id, date, type, starts_at, ends_at)
);

CREATE INDEX room_availability_exceptions_room_date_idx
ON public.room_availability_exceptions (room_id, date);

CREATE TRIGGER set_room_availability_exceptions_updated_at
BEFORE UPDATE ON public.room_availability_exceptions
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.room_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_public_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_opening_hours FORCE ROW LEVEL SECURITY;
ALTER TABLE public.room_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_availability_exceptions FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.room_public_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.room_opening_hours FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.room_availability_exceptions FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.room_public_profiles TO authenticated;
GRANT SELECT ON public.room_public_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_public_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_opening_hours TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_opening_hours TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_availability_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_availability_exceptions TO service_role;

CREATE POLICY "Staff can read permitted room public profiles"
ON public.room_public_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (
    public.has_role('specialist'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_public_profiles.room_id AND rooms.active
    )
  )
);

CREATE POLICY "Anon can read published room public profiles"
ON public.room_public_profiles
FOR SELECT
TO anon
USING (
  published
  AND EXISTS (
    SELECT 1 FROM public.rooms
    WHERE rooms.id = room_public_profiles.room_id
      AND rooms.active
      AND rooms.publicly_visible
  )
);

CREATE POLICY "Admins can insert room public profiles"
ON public.room_public_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update room public profiles"
ON public.room_public_profiles
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Staff can read permitted room opening hours"
ON public.room_opening_hours
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (
    public.has_role('specialist'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_opening_hours.room_id AND rooms.active
    )
  )
);

CREATE POLICY "Admins can insert room opening hours"
ON public.room_opening_hours FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update room opening hours"
ON public.room_opening_hours FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete room opening hours"
ON public.room_opening_hours FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Staff can read permitted room availability exceptions"
ON public.room_availability_exceptions
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (
    public.has_role('specialist'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.rooms
      WHERE rooms.id = room_availability_exceptions.room_id AND rooms.active
    )
  )
);

CREATE POLICY "Admins can insert room availability exceptions"
ON public.room_availability_exceptions FOR INSERT TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can update room availability exceptions"
ON public.room_availability_exceptions FOR UPDATE TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins can delete room availability exceptions"
ON public.room_availability_exceptions FOR DELETE TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.replace_room_opening_hours(
  p_room_id uuid,
  p_intervals jsonb
)
RETURNS SETOF public.room_opening_hours
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can replace room opening hours'
      USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_intervals) <> 'array' THEN
    RAISE EXCEPTION 'Opening hours must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.room_opening_hours WHERE room_id = p_room_id;

  INSERT INTO public.room_opening_hours (room_id, weekday, starts_at, ends_at)
  SELECT p_room_id, interval.weekday, interval.starts_at, interval.ends_at
  FROM jsonb_to_recordset(p_intervals) AS interval(
    weekday smallint,
    starts_at time,
    ends_at time
  );

  RETURN QUERY
  SELECT * FROM public.room_opening_hours
  WHERE room_id = p_room_id
  ORDER BY weekday, starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_room_opening_hours(uuid, jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_room_opening_hours(uuid, jsonb)
TO authenticated, service_role;
