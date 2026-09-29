-- A specialist's name as first and last name (profile editor, review,
-- public profile) instead of one "name" field: initials and forms of
-- address are then unambiguous. display_name stays, made of the two, so
-- the site and lists keep reading it. The approved name also becomes the
-- account's name.

ALTER TABLE public.specialist_profile_drafts
  ADD COLUMN first_name text NOT NULL DEFAULT '',
  ADD COLUMN last_name text NOT NULL DEFAULT '',
  ADD CONSTRAINT specialist_profile_drafts_name_parts_length CHECK (
    char_length(first_name) <= 80 AND char_length(last_name) <= 80
  );

ALTER TABLE public.specialist_public_profiles
  ADD COLUMN first_name text NOT NULL DEFAULT '',
  ADD COLUMN last_name text NOT NULL DEFAULT '',
  ADD CONSTRAINT specialist_public_profiles_name_parts_length CHECK (
    char_length(first_name) <= 80 AND char_length(last_name) <= 80
  );

-- Existing names: the first word is the first name, the rest the last name.
UPDATE public.specialist_profile_drafts
SET first_name = split_part(trim(display_name), ' ', 1),
    last_name = trim(substr(trim(display_name), char_length(split_part(trim(display_name), ' ', 1)) + 1))
WHERE trim(display_name) <> '';

UPDATE public.specialist_public_profiles
SET first_name = split_part(trim(display_name), ' ', 1),
    last_name = trim(substr(trim(display_name), char_length(split_part(trim(display_name), ' ', 1)) + 1))
WHERE trim(display_name) <> '';

-- Accounts without a name take their published profile's.
UPDATE public.profiles AS profile
SET first_name = public_profile.first_name,
    last_name = public_profile.last_name
FROM public.specialists AS specialist
JOIN public.specialist_public_profiles AS public_profile
  ON public_profile.specialist_id = specialist.id
WHERE specialist.user_id = profile.id
  AND trim(profile.first_name) = ''
  AND trim(profile.last_name) = ''
  AND public_profile.publication_status = 'published'
  AND public_profile.first_name <> '';

-- A new specialist's public profile starts with the account's name.
CREATE OR REPLACE FUNCTION private.handle_specialist_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_specialist_id uuid;
BEGIN
  IF NEW.role <> 'specialist' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.specialists (user_id, public_slug)
  VALUES (
    NEW.user_id,
    'specialist-' || replace(NEW.user_id::text, '-', '')
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO created_specialist_id;

  IF created_specialist_id IS NULL THEN
    SELECT id INTO created_specialist_id
    FROM public.specialists
    WHERE user_id = NEW.user_id;
  END IF;

  INSERT INTO public.specialist_public_profiles (
    specialist_id, first_name, last_name, display_name
  )
  SELECT
    created_specialist_id,
    trim(profile.first_name),
    trim(profile.last_name),
    trim(concat_ws(' ', trim(profile.first_name), trim(profile.last_name)))
  FROM public.profiles AS profile
  WHERE profile.id = NEW.user_id
  ON CONFLICT (specialist_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP FUNCTION public.save_my_specialist_profile_draft(
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text, text[]
);

CREATE FUNCTION public.save_my_specialist_profile_draft(
  p_first_name text,
  p_last_name text,
  p_short_bio text DEFAULT '',
  p_long_bio jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  p_profile_photo_url text DEFAULT NULL,
  p_portrait_photo_url text DEFAULT NULL,
  p_languages text[] DEFAULT '{}',
  p_therapy_approaches text[] DEFAULT '{}',
  p_specializations text[] DEFAULT '{}',
  p_education text[] DEFAULT '{}',
  p_certificates text[] DEFAULT '{}',
  p_modalities text[] DEFAULT '{}',
  p_professional_title text DEFAULT NULL,
  p_client_groups text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_specialist_id uuid;
  current_draft_id uuid;
  v_first_name text := trim(coalesce(p_first_name, ''));
  v_last_name text := trim(coalesce(p_last_name, ''));
  v_display_name text := trim(concat_ws(' ',
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), '')
  ));
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'specialist'
  ) THEN
    RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO current_specialist_id
  FROM public.specialists
  WHERE user_id = auth.uid();

  IF current_specialist_id IS NULL THEN
    RAISE EXCEPTION 'Specialist record not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO current_draft_id
  FROM public.specialist_profile_drafts
  WHERE specialist_id = current_specialist_id
    AND status IN ('draft', 'pending_review')
  FOR UPDATE;

  IF current_draft_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.specialist_profile_drafts
    WHERE id = current_draft_id AND status = 'pending_review'
  ) THEN
    RAISE EXCEPTION 'Pending drafts cannot be edited' USING ERRCODE = '55000';
  END IF;

  IF current_draft_id IS NULL THEN
    INSERT INTO public.specialist_profile_drafts (
      specialist_id, first_name, last_name, display_name, professional_title,
      short_bio, long_bio, profile_photo_url, portrait_photo_url, languages,
      therapy_approaches, specializations, education, certificates, modalities,
      client_groups
    ) VALUES (
      current_specialist_id, v_first_name, v_last_name, v_display_name,
      nullif(trim(p_professional_title), ''),
      p_short_bio, p_long_bio, p_profile_photo_url, p_portrait_photo_url, p_languages,
      p_therapy_approaches, p_specializations, p_education, p_certificates, p_modalities,
      p_client_groups
    )
    RETURNING id INTO current_draft_id;
  ELSE
    UPDATE public.specialist_profile_drafts
    SET first_name = v_first_name,
        last_name = v_last_name,
        display_name = v_display_name,
        professional_title = nullif(trim(p_professional_title), ''),
        short_bio = p_short_bio,
        long_bio = p_long_bio,
        profile_photo_url = p_profile_photo_url,
        portrait_photo_url = p_portrait_photo_url,
        languages = p_languages,
        therapy_approaches = p_therapy_approaches,
        specializations = p_specializations,
        education = p_education,
        certificates = p_certificates,
        modalities = p_modalities,
        client_groups = p_client_groups
    WHERE id = current_draft_id;
  END IF;

  RETURN current_draft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_specialist_profile_draft(
  text, text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text, text[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_specialist_profile_draft(
  text, text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text, text[]
) TO authenticated;

-- A draft goes for review only with both a first and a last name.
CREATE OR REPLACE FUNCTION public.submit_my_specialist_profile_draft(p_draft_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'specialist'
  ) THEN
    RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.specialist_profile_drafts AS draft
  SET status = 'pending_review',
      submitted_at = now(),
      submitted_by = auth.uid()
  FROM public.specialists AS specialist
  WHERE draft.id = p_draft_id
    AND draft.specialist_id = specialist.id
    AND specialist.user_id = auth.uid()
    AND draft.status = 'draft'
    AND char_length(trim(draft.first_name)) > 0
    AND char_length(trim(draft.last_name)) > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Editable complete draft not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_specialist_profile_draft(
  p_draft_id uuid,
  p_review_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  draft_record public.specialist_profile_drafts%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT draft.* INTO draft_record
  FROM public.specialist_profile_drafts AS draft
  WHERE draft.id = p_draft_id
  FOR UPDATE;

  IF draft_record.id IS NULL OR draft_record.status <> 'pending_review' THEN
    RAISE EXCEPTION 'Pending draft not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.specialist_public_profiles (
    specialist_id, first_name, last_name, display_name, short_bio, long_bio,
    profile_photo_url, portrait_photo_url, languages, therapy_approaches,
    specializations, education, certificates, modalities, client_groups,
    publication_status, published_at
  ) VALUES (
    draft_record.specialist_id, draft_record.first_name, draft_record.last_name,
    draft_record.display_name, draft_record.short_bio, draft_record.long_bio,
    draft_record.profile_photo_url, draft_record.portrait_photo_url, draft_record.languages, draft_record.therapy_approaches,
    draft_record.specializations, draft_record.education, draft_record.certificates, draft_record.modalities,
    draft_record.client_groups,
    'published', now()
  )
  ON CONFLICT (specialist_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      display_name = EXCLUDED.display_name,
      short_bio = EXCLUDED.short_bio,
      long_bio = EXCLUDED.long_bio,
      profile_photo_url = EXCLUDED.profile_photo_url,
      portrait_photo_url = EXCLUDED.portrait_photo_url,
      languages = EXCLUDED.languages,
      therapy_approaches = EXCLUDED.therapy_approaches,
      specializations = EXCLUDED.specializations,
      education = EXCLUDED.education,
      certificates = EXCLUDED.certificates,
      modalities = EXCLUDED.modalities,
      client_groups = EXCLUDED.client_groups,
      publication_status = 'published',
      published_at = now();

  -- The title lives on the specialist (it is also shown in the portals);
  -- a draft without one leaves the current title unchanged.
  IF draft_record.professional_title IS NOT NULL THEN
    UPDATE public.specialists
    SET professional_title = draft_record.professional_title
    WHERE id = draft_record.specialist_id;
  END IF;

  -- The approved name is the person's name: the account takes it too.
  IF trim(draft_record.first_name) <> '' AND trim(draft_record.last_name) <> '' THEN
    UPDATE public.profiles AS profile
    SET first_name = draft_record.first_name,
        last_name = draft_record.last_name
    FROM public.specialists AS specialist
    WHERE specialist.id = draft_record.specialist_id
      AND profile.id = specialist.user_id;
  END IF;

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;
