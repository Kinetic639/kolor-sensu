CREATE TYPE public.profile_publication_status AS ENUM (
  'draft',
  'pending_review',
  'published',
  'rejected'
);

CREATE TABLE public.specialists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  accepting_new_clients boolean NOT NULL DEFAULT false,
  public_slug text NOT NULL UNIQUE,
  professional_title text,
  joined_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialists_public_slug_format CHECK (
    public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(public_slug) BETWEEN 3 AND 100
  ),
  CONSTRAINT specialists_professional_title_length CHECK (
    professional_title IS NULL OR char_length(professional_title) <= 160
  )
);

CREATE TABLE public.specialist_public_profiles (
  specialist_id uuid PRIMARY KEY REFERENCES public.specialists (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  short_bio text NOT NULL DEFAULT '',
  long_bio text NOT NULL DEFAULT '',
  profile_photo_url text,
  portrait_photo_url text,
  languages text[] NOT NULL DEFAULT '{}',
  therapy_approaches text[] NOT NULL DEFAULT '{}',
  specializations text[] NOT NULL DEFAULT '{}',
  education text[] NOT NULL DEFAULT '{}',
  certificates text[] NOT NULL DEFAULT '{}',
  modalities text[] NOT NULL DEFAULT '{}',
  publication_status public.profile_publication_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_public_profiles_status CHECK (
    publication_status IN ('draft', 'published')
  ),
  CONSTRAINT specialist_public_profiles_publication_time CHECK (
    (publication_status = 'published' AND published_at IS NOT NULL)
    OR (publication_status = 'draft' AND published_at IS NULL)
  ),
  CONSTRAINT specialist_public_profiles_display_name_length CHECK (
    char_length(display_name) <= 160
    AND (publication_status <> 'published' OR char_length(trim(display_name)) > 0)
  ),
  CONSTRAINT specialist_public_profiles_short_bio_length CHECK (char_length(short_bio) <= 500),
  CONSTRAINT specialist_public_profiles_long_bio_length CHECK (char_length(long_bio) <= 10000),
  CONSTRAINT specialist_public_profiles_photo_url_length CHECK (
    (profile_photo_url IS NULL OR char_length(profile_photo_url) <= 2048)
    AND (portrait_photo_url IS NULL OR char_length(portrait_photo_url) <= 2048)
  ),
  CONSTRAINT specialist_public_profiles_array_limits CHECK (
    cardinality(languages) <= 20
    AND cardinality(therapy_approaches) <= 50
    AND cardinality(specializations) <= 50
    AND cardinality(education) <= 50
    AND cardinality(certificates) <= 50
    AND cardinality(modalities) <= 20
    AND coalesce(array_ndims(languages), 1) = 1
    AND coalesce(array_ndims(therapy_approaches), 1) = 1
    AND coalesce(array_ndims(specializations), 1) = 1
    AND coalesce(array_ndims(education), 1) = 1
    AND coalesce(array_ndims(certificates), 1) = 1
    AND coalesce(array_ndims(modalities), 1) = 1
  )
);

CREATE TABLE public.specialist_profile_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  short_bio text NOT NULL DEFAULT '',
  long_bio text NOT NULL DEFAULT '',
  profile_photo_url text,
  portrait_photo_url text,
  languages text[] NOT NULL DEFAULT '{}',
  therapy_approaches text[] NOT NULL DEFAULT '{}',
  specializations text[] NOT NULL DEFAULT '{}',
  education text[] NOT NULL DEFAULT '{}',
  certificates text[] NOT NULL DEFAULT '{}',
  modalities text[] NOT NULL DEFAULT '{}',
  status public.profile_publication_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  submitted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  review_comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_profile_drafts_display_name_length CHECK (char_length(display_name) <= 160),
  CONSTRAINT specialist_profile_drafts_short_bio_length CHECK (char_length(short_bio) <= 500),
  CONSTRAINT specialist_profile_drafts_long_bio_length CHECK (char_length(long_bio) <= 10000),
  CONSTRAINT specialist_profile_drafts_photo_url_length CHECK (
    (profile_photo_url IS NULL OR char_length(profile_photo_url) <= 2048)
    AND (portrait_photo_url IS NULL OR char_length(portrait_photo_url) <= 2048)
  ),
  CONSTRAINT specialist_profile_drafts_review_comment_length CHECK (
    review_comment IS NULL OR char_length(review_comment) <= 2000
  ),
  CONSTRAINT specialist_profile_drafts_array_limits CHECK (
    cardinality(languages) <= 20
    AND cardinality(therapy_approaches) <= 50
    AND cardinality(specializations) <= 50
    AND cardinality(education) <= 50
    AND cardinality(certificates) <= 50
    AND cardinality(modalities) <= 20
    AND coalesce(array_ndims(languages), 1) = 1
    AND coalesce(array_ndims(therapy_approaches), 1) = 1
    AND coalesce(array_ndims(specializations), 1) = 1
    AND coalesce(array_ndims(education), 1) = 1
    AND coalesce(array_ndims(certificates), 1) = 1
    AND coalesce(array_ndims(modalities), 1) = 1
  ),
  CONSTRAINT specialist_profile_drafts_submission_metadata CHECK (
    (status = 'draft' AND submitted_at IS NULL AND submitted_by IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status = 'pending_review' AND submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status IN ('published', 'rejected') AND submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX specialist_profile_drafts_one_active_idx
ON public.specialist_profile_drafts (specialist_id)
WHERE status IN ('draft', 'pending_review');

CREATE INDEX specialist_profile_drafts_pending_review_idx
ON public.specialist_profile_drafts (submitted_at, specialist_id)
WHERE status = 'pending_review';

CREATE INDEX specialist_public_profiles_published_idx
ON public.specialist_public_profiles (published_at DESC, specialist_id)
WHERE publication_status = 'published';

CREATE TRIGGER set_specialists_updated_at
BEFORE UPDATE ON public.specialists
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_specialist_public_profiles_updated_at
BEFORE UPDATE ON public.specialist_public_profiles
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_specialist_profile_drafts_updated_at
BEFORE UPDATE ON public.specialist_profile_drafts
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialists FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_public_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_profile_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_profile_drafts FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.specialists FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.specialist_public_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.specialist_profile_drafts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TYPE public.profile_publication_status FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.profile_publication_status TO authenticated, service_role;
GRANT SELECT (id, active, accepting_new_clients, public_slug, professional_title, joined_at)
  ON public.specialists TO anon;
GRANT SELECT ON public.specialist_public_profiles TO anon;
GRANT SELECT ON public.specialists, public.specialist_public_profiles, public.specialist_profile_drafts
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.specialists, public.specialist_public_profiles, public.specialist_profile_drafts
  TO service_role;

CREATE FUNCTION private.specialist_is_active(target_specialist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE id = target_specialist_id
      AND active
  );
$$;

CREATE FUNCTION private.specialist_has_published_profile(target_specialist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles
    WHERE specialist_id = target_specialist_id
      AND publication_status = 'published'
  );
$$;

REVOKE ALL ON FUNCTION private.specialist_is_active(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.specialist_has_published_profile(uuid) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.specialist_is_active(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.specialist_has_published_profile(uuid) TO anon, authenticated;

CREATE POLICY "Public can read active specialists with published profiles"
ON public.specialists
FOR SELECT
TO anon
USING (active AND private.specialist_has_published_profile(id));

CREATE POLICY "Authenticated users can read permitted specialists"
ON public.specialists
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role('admin'::public.app_role)
  OR (active AND private.specialist_has_published_profile(id))
);

CREATE POLICY "Public can read published profiles of active specialists"
ON public.specialist_public_profiles
FOR SELECT
TO anon
USING (
  publication_status = 'published'
  AND private.specialist_is_active(specialist_id)
);

CREATE POLICY "Authenticated users can read permitted public profiles"
ON public.specialist_public_profiles
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_public_profiles.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
  OR (
    publication_status = 'published'
    AND private.specialist_is_active(specialist_id)
  )
);

CREATE POLICY "Specialists and admins can read permitted drafts"
ON public.specialist_profile_drafts
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_profile_drafts.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);

CREATE FUNCTION public.save_my_specialist_profile_draft(
  p_display_name text,
  p_short_bio text DEFAULT '',
  p_long_bio text DEFAULT '',
  p_profile_photo_url text DEFAULT NULL,
  p_portrait_photo_url text DEFAULT NULL,
  p_languages text[] DEFAULT '{}',
  p_therapy_approaches text[] DEFAULT '{}',
  p_specializations text[] DEFAULT '{}',
  p_education text[] DEFAULT '{}',
  p_certificates text[] DEFAULT '{}',
  p_modalities text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_specialist_id uuid;
  current_draft_id uuid;
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
      specialist_id, display_name, short_bio, long_bio,
      profile_photo_url, portrait_photo_url, languages, therapy_approaches,
      specializations, education, certificates, modalities
    ) VALUES (
      current_specialist_id, p_display_name, p_short_bio, p_long_bio,
      p_profile_photo_url, p_portrait_photo_url, p_languages, p_therapy_approaches,
      p_specializations, p_education, p_certificates, p_modalities
    )
    RETURNING id INTO current_draft_id;
  ELSE
    UPDATE public.specialist_profile_drafts
    SET display_name = p_display_name,
        short_bio = p_short_bio,
        long_bio = p_long_bio,
        profile_photo_url = p_profile_photo_url,
        portrait_photo_url = p_portrait_photo_url,
        languages = p_languages,
        therapy_approaches = p_therapy_approaches,
        specializations = p_specializations,
        education = p_education,
        certificates = p_certificates,
        modalities = p_modalities
    WHERE id = current_draft_id;
  END IF;

  RETURN current_draft_id;
END;
$$;

CREATE FUNCTION public.submit_my_specialist_profile_draft(p_draft_id uuid)
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
    AND char_length(trim(draft.display_name)) > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Editable complete draft not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE FUNCTION public.approve_specialist_profile_draft(
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
  owner_user_id uuid;
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

  SELECT user_id INTO owner_user_id
  FROM public.specialists
  WHERE id = draft_record.specialist_id;

  IF owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Reviewers cannot approve their own profile' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.specialist_public_profiles (
    specialist_id, display_name, short_bio, long_bio,
    profile_photo_url, portrait_photo_url, languages, therapy_approaches,
    specializations, education, certificates, modalities,
    publication_status, published_at
  ) VALUES (
    draft_record.specialist_id, draft_record.display_name, draft_record.short_bio, draft_record.long_bio,
    draft_record.profile_photo_url, draft_record.portrait_photo_url, draft_record.languages, draft_record.therapy_approaches,
    draft_record.specializations, draft_record.education, draft_record.certificates, draft_record.modalities,
    'published', now()
  )
  ON CONFLICT (specialist_id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
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
      publication_status = 'published',
      published_at = now();

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;

CREATE FUNCTION public.reject_specialist_profile_draft(
  p_draft_id uuid,
  p_review_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_user_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  IF p_review_comment IS NULL OR char_length(trim(p_review_comment)) = 0 THEN
    RAISE EXCEPTION 'A rejection comment is required' USING ERRCODE = '22023';
  END IF;

  SELECT specialist.user_id INTO owner_user_id
  FROM public.specialist_profile_drafts AS draft
  JOIN public.specialists AS specialist ON specialist.id = draft.specialist_id
  WHERE draft.id = p_draft_id
    AND draft.status = 'pending_review'
  FOR UPDATE OF draft;

  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Pending draft not found' USING ERRCODE = 'P0002';
  END IF;

  IF owner_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Reviewers cannot reject their own profile' USING ERRCODE = '42501';
  END IF;

  UPDATE public.specialist_profile_drafts
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = trim(p_review_comment)
  WHERE id = p_draft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_specialist_profile_draft(text, text, text, text, text, text[], text[], text[], text[], text[], text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_my_specialist_profile_draft(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_specialist_profile_draft(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_specialist_profile_draft(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_specialist_profile_draft(text, text, text, text, text, text[], text[], text[], text[], text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_my_specialist_profile_draft(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_specialist_profile_draft(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_specialist_profile_draft(uuid, text) TO authenticated;

CREATE FUNCTION private.can_manage_specialist_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE id::text = split_part(object_name, '/', 1)
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_roles
          WHERE user_id = auth.uid() AND role = 'admin'
        )
      )
  );
$$;

CREATE FUNCTION private.can_read_published_specialist_media(object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles AS profile
    JOIN public.specialists AS specialist ON specialist.id = profile.specialist_id
    WHERE specialist.active
      AND profile.publication_status = 'published'
      AND object_name IN (profile.profile_photo_url, profile.portrait_photo_url)
  );
$$;

REVOKE ALL ON FUNCTION private.can_manage_specialist_media(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_read_published_specialist_media(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_specialist_media(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_published_specialist_media(text) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'specialist-profile-media',
  'specialist-profile-media',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Published specialist media is readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'specialist-profile-media'
  AND (
    private.can_read_published_specialist_media(name)
    OR private.can_manage_specialist_media(name)
  )
);

CREATE POLICY "Specialists and admins can upload specialist media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'specialist-profile-media'
  AND private.can_manage_specialist_media(name)
);

CREATE POLICY "Specialists and admins can update specialist media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'specialist-profile-media'
  AND private.can_manage_specialist_media(name)
)
WITH CHECK (
  bucket_id = 'specialist-profile-media'
  AND private.can_manage_specialist_media(name)
);

CREATE POLICY "Specialists and admins can delete specialist media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'specialist-profile-media'
  AND private.can_manage_specialist_media(name)
);

CREATE FUNCTION private.handle_specialist_role_insert()
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
    'specialist-' || left(replace(NEW.user_id::text, '-', ''), 12)
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO created_specialist_id;

  IF created_specialist_id IS NULL THEN
    SELECT id INTO created_specialist_id
    FROM public.specialists
    WHERE user_id = NEW.user_id;
  END IF;

  INSERT INTO public.specialist_public_profiles (specialist_id, display_name)
  SELECT
    created_specialist_id,
    trim(concat_ws(' ', profile.first_name, profile.last_name))
  FROM public.profiles AS profile
  WHERE profile.id = NEW.user_id
  ON CONFLICT (specialist_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_specialist_role_insert() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER create_specialist_after_role_insert
AFTER INSERT ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'specialist')
EXECUTE FUNCTION private.handle_specialist_role_insert();

INSERT INTO public.specialists (user_id, public_slug)
SELECT
  role.user_id,
  'specialist-' || left(replace(role.user_id::text, '-', ''), 12)
FROM public.user_roles AS role
WHERE role.role = 'specialist'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.specialist_public_profiles (specialist_id, display_name)
SELECT
  specialist.id,
  trim(concat_ws(' ', profile.first_name, profile.last_name))
FROM public.specialists AS specialist
JOIN public.profiles AS profile ON profile.id = specialist.user_id
ON CONFLICT (specialist_id) DO NOTHING;
