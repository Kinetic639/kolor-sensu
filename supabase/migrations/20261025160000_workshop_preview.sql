-- A workshop as its page shows it, any status, for the admin's preview of a
-- draft (#197): the site reads it with its secret key, in Draft Mode only.
-- (The body of list_public_workshops in 20261025150000_workshop_directions,
-- for one workshop by id.)
CREATE FUNCTION public.workshop_preview(p_id uuid)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  short_description text,
  body jsonb,
  audience text,
  agenda text,
  cover_image_path text,
  cover_alt text,
  seo_title text,
  seo_description text,
  modality public.workshop_modality,
  status public.workshop_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_minor integer,
  currency_code text,
  capacity integer,
  min_participants integer,
  location_name text,
  location_address text,
  location_city text,
  room_name text,
  leaders jsonb,
  seats_left integer,
  registration_open boolean,
  confirmed boolean,
  updated_at timestamptz,
  location_directions text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT w.id, w.slug, w.title, w.short_description, w.body, w.audience, w.agenda,
    w.cover_image_path, w.cover_alt, w.seo_title, w.seo_description,
    w.modality, w.status, w.starts_at, w.ends_at, w.price_minor, w.currency_code,
    w.capacity, w.min_participants,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    location.city,
    room.name,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'slug', specialist.public_slug,
          'name', profile.display_name,
          'title', specialist.professional_title,
          'photoPath', profile.profile_photo_url
        ) ORDER BY leader.main DESC, profile.display_name)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader
      JOIN public.specialists AS specialist ON specialist.id = leader.id
      JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
      WHERE specialist.publicly_visible AND private.specialist_has_published_profile(specialist.id)
    ), '[]'::jsonb),
    greatest(w.capacity - private.workshop_seats_taken(w.id), 0),
    w.status = 'published' AND w.registration_enabled
      AND now() < private.workshop_closes_at(w.registration_closes_at, w.starts_at),
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.updated_at,
    location.directions
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = p_id;
$$;

REVOKE ALL ON FUNCTION public.workshop_preview(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_preview(uuid) TO service_role;
