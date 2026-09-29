-- Room occupancy shows who has the room as colleagues know them: first and
-- last name (for initials) and a picture — the account's, else the
-- published profile photo, else the portrait (storage paths are signed by
-- the page; storage policies still decide who may read them).

DROP FUNCTION public.list_room_occupancy(date, date);

CREATE FUNCTION public.list_room_occupancy(p_from date, p_to date)
RETURNS TABLE (
  room_id uuid,
  day date,
  starts_at time,
  ends_at time,
  specialist_id uuid,
  specialist_name text,
  specialist_first_name text,
  specialist_last_name text,
  specialist_avatar_url text,
  specialist_photo_path text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_role('specialist'::public.app_role)
    OR public.has_role('admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    rule.room_id,
    candidate.day,
    rule.starts_at,
    rule.ends_at,
    rule.specialist_id,
    private.specialist_display_name(rule.specialist_id),
    person.first_name,
    person.last_name,
    nullif(trim(profile.avatar_url), ''),
    CASE WHEN public_profile.publication_status = 'published'
      THEN coalesce(public_profile.profile_photo_url, public_profile.portrait_photo_url)
    END
  FROM public.specialist_availability_rules AS rule
  JOIN public.rooms AS room ON room.id = rule.room_id AND room.active
  JOIN public.specialists AS specialist ON specialist.id = rule.specialist_id
  JOIN public.profiles AS profile ON profile.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS public_profile
    ON public_profile.specialist_id = specialist.id
  -- The account's name, else the public profile's.
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN trim(profile.first_name) <> '' OR trim(profile.last_name) <> ''
        THEN trim(profile.first_name) ELSE coalesce(trim(public_profile.first_name), '') END AS first_name,
      CASE WHEN trim(profile.first_name) <> '' OR trim(profile.last_name) <> ''
        THEN trim(profile.last_name) ELSE coalesce(trim(public_profile.last_name), '') END AS last_name
  ) AS person
  CROSS JOIN LATERAL (
    SELECT generated::date AS day
    FROM generate_series(
      greatest(p_from, rule.valid_from),
      least(p_to, coalesce(rule.valid_until, p_to)),
      interval '1 day'
    ) AS generated
  ) AS candidate
  WHERE rule.room_id IS NOT NULL
    AND rule.valid_from <= p_to
    AND (rule.valid_until IS NULL OR rule.valid_until >= p_from)
    AND private.availability_rule_on(rule.id, candidate.day)
  ORDER BY candidate.day, rule.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION public.list_room_occupancy(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_room_occupancy(date, date) TO authenticated;
