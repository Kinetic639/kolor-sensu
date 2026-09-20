-- Rooms / Resource Domain foundation.
--
-- A room is a physical resource that belongs to exactly one location. It is
-- deliberately NOT owned by a specialist: multiple specialists may use the
-- same room at different times, and a specialist may work in different
-- rooms over time. Ownership stays at the location level only -- there is
-- no specialist_id column on this table, by design.
--
-- Slug uniqueness is scoped to (location_id, slug), not globally: Kolor
-- Sensu is single-center today but may add locations later, and two
-- different locations independently having a "sala-1" is a normal,
-- expected naming pattern. A global slug would force every room name to be
-- prefixed with its location for no product reason. See
-- docs/architecture/rooms-resource-domain.md for the full rationale.
--
-- Public exposure is intentionally NOT granted in this migration: no
-- current public page needs room data (Home and /specjalisci don't
-- reference rooms), so anon gets zero access to this table rather than an
-- unused public policy guessing at a shape nothing consumes yet. This can
-- be added later, narrowly scoped to safe fields, if a real public need
-- appears.

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.locations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  publicly_visible boolean NOT NULL DEFAULT false,
  capacity integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rooms_location_slug_key UNIQUE (location_id, slug),
  CONSTRAINT rooms_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT rooms_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 3 AND 100
  ),
  CONSTRAINT rooms_description_length CHECK (
    description IS NULL OR char_length(description) <= 2000
  ),
  CONSTRAINT rooms_capacity_range CHECK (capacity BETWEEN 1 AND 100),
  CONSTRAINT rooms_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX rooms_location_id_active_sort_order_idx
ON public.rooms (location_id, active, sort_order);

CREATE TRIGGER set_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.rooms FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO service_role;

CREATE POLICY "Authenticated users can read permitted rooms"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (public.has_role('specialist'::public.app_role) AND active)
);

CREATE POLICY "Admins can insert rooms"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update rooms"
ON public.rooms
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));
