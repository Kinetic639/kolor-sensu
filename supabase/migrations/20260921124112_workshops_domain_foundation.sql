-- Workshops Domain: a scheduled group event owned by Admin. MVP models one
-- concrete scheduled occurrence per row (no template/occurrence split yet --
-- see docs/architecture/workshops-domain.md for the future recurring-series
-- extension path).
--
-- `rooms` needs a composite unique key so a workshop's room_id/location_id
-- pair can be enforced by a normal foreign key (Postgres FK MATCH SIMPLE
-- skips the check whenever any referencing column is NULL, which is exactly
-- what an online workshop with no room needs).
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_id_location_id_key UNIQUE (id, location_id);

CREATE TYPE public.workshop_modality AS ENUM ('in_person', 'online');

-- draft: Admin editing, never public.
-- published: public event, appears in the upcoming public list.
-- cancelled: event cancelled; remains addressable at its detail URL and
--   clearly labelled, but excluded from the public upcoming list.
-- completed: event took place; addressable, excluded from the upcoming list.
-- Deliberately the only lifecycle flag -- no separate active/publicly_visible
-- booleans, to avoid the redundant/conflicting truth the task explicitly
-- warns about. The canonical public rule is simply `status <> 'draft'`.
CREATE TYPE public.workshop_status AS ENUM (
  'draft',
  'published',
  'cancelled',
  'completed'
);

CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text,
  long_description text,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  location_id uuid REFERENCES public.locations (id) ON DELETE RESTRICT,
  room_id uuid REFERENCES public.rooms (id) ON DELETE RESTRICT,
  modality public.workshop_modality NOT NULL DEFAULT 'in_person',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  price_minor integer NOT NULL,
  currency_code text NOT NULL DEFAULT 'PLN',
  capacity integer NOT NULL,
  registration_enabled boolean NOT NULL DEFAULT false,
  status public.workshop_status NOT NULL DEFAULT 'draft',
  cover_image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshops_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT workshops_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 3 AND 100
  ),
  CONSTRAINT workshops_short_description_length CHECK (
    short_description IS NULL OR char_length(short_description) <= 500
  ),
  -- long_description is plain text for this phase (the shared Rich Text
  -- Platform is still an in-progress, uncommitted, currently-broken build
  -- elsewhere in this repo -- see docs/architecture/workshops-domain.md).
  CONSTRAINT workshops_long_description_length CHECK (
    long_description IS NULL OR char_length(long_description) <= 10000
  ),
  CONSTRAINT workshops_cover_image_path_length CHECK (
    cover_image_path IS NULL OR char_length(cover_image_path) <= 2048
  ),
  CONSTRAINT workshops_time_range CHECK (starts_at < ends_at),
  CONSTRAINT workshops_price_range CHECK (price_minor BETWEEN 0 AND 10000000),
  CONSTRAINT workshops_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT workshops_capacity_range CHECK (capacity BETWEEN 1 AND 500),
  -- online: no location, no room. in_person: a location is required; a
  -- room is optional (not every location has a dedicated group room yet),
  -- but when present must belong to that same location -- enforced below by
  -- the composite foreign key, not by this CHECK.
  CONSTRAINT workshops_modality_location_check CHECK (
    (modality = 'online' AND location_id IS NULL AND room_id IS NULL)
    OR (modality = 'in_person' AND location_id IS NOT NULL)
  ),
  CONSTRAINT workshops_room_location_fkey FOREIGN KEY (room_id, location_id)
    REFERENCES public.rooms (id, location_id)
);

CREATE INDEX workshops_status_starts_at_idx
ON public.workshops (status, starts_at);

CREATE INDEX workshops_specialist_id_starts_at_idx
ON public.workshops (specialist_id, starts_at);

CREATE INDEX workshops_room_id_starts_at_idx
ON public.workshops (room_id, starts_at)
WHERE room_id IS NOT NULL;

CREATE TRIGGER set_workshops_updated_at
BEFORE UPDATE ON public.workshops
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshops FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.workshops FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TYPE public.workshop_modality FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.workshop_status FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.workshop_modality TO anon, authenticated, service_role;
GRANT USAGE ON TYPE public.workshop_status TO anon, authenticated, service_role;

GRANT SELECT ON public.workshops TO anon;
GRANT SELECT, INSERT, UPDATE ON public.workshops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshops TO service_role;

-- Admin: full read. Specialist: read only the workshops they lead (no
-- Specialist Portal workshop feature is built in this task -- this is
-- minimal safe read access for future portal integration only).
CREATE POLICY "Authenticated users can read permitted workshops"
ON public.workshops
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (
    public.has_role('specialist'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.specialists
      WHERE specialists.id = workshops.specialist_id
        AND specialists.user_id = (SELECT auth.uid())
    )
  )
);

-- No anon-safe "is public" lookup function is needed here (unlike Services/
-- Rooms) because the predicate is a single column on the table being
-- policed, not a cross-table lookup.
CREATE POLICY "Public can read non-draft workshops"
ON public.workshops
FOR SELECT
TO anon
USING (status <> 'draft');

CREATE POLICY "Admins can insert workshops"
ON public.workshops
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update workshops"
ON public.workshops
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
