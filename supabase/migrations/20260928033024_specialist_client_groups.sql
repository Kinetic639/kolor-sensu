-- Who a specialist works with (adults, teens, children, couples, families):
-- proposed in the specialist's draft, reviewed like the rest of the profile
-- and shown on the public profile. Stored as fixed codes so the site can
-- later filter by them; labels live in the application.

ALTER TABLE public.specialist_profile_drafts
  ADD COLUMN client_groups text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT specialist_profile_drafts_client_groups_known CHECK (
    client_groups <@ ARRAY['adults', 'teens', 'children', 'couples', 'families']
  );

ALTER TABLE public.specialist_public_profiles
  ADD COLUMN client_groups text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT specialist_public_profiles_client_groups_known CHECK (
    client_groups <@ ARRAY['adults', 'teens', 'children', 'couples', 'families']
  );

DROP FUNCTION public.save_my_specialist_profile_draft(
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text
);

CREATE FUNCTION public.save_my_specialist_profile_draft(
  p_display_name text,
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
      specialist_id, display_name, professional_title, short_bio, long_bio,
      profile_photo_url, portrait_photo_url, languages, therapy_approaches,
      specializations, education, certificates, modalities, client_groups
    ) VALUES (
      current_specialist_id, p_display_name, nullif(trim(p_professional_title), ''),
      p_short_bio, p_long_bio,
      p_profile_photo_url, p_portrait_photo_url, p_languages, p_therapy_approaches,
      p_specializations, p_education, p_certificates, p_modalities, p_client_groups
    )
    RETURNING id INTO current_draft_id;
  ELSE
    UPDATE public.specialist_profile_drafts
    SET display_name = p_display_name,
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
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text, text[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_specialist_profile_draft(
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text, text[]
) TO authenticated;

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
    specialist_id, display_name, short_bio, long_bio,
    profile_photo_url, portrait_photo_url, languages, therapy_approaches,
    specializations, education, certificates, modalities, client_groups,
    publication_status, published_at
  ) VALUES (
    draft_record.specialist_id, draft_record.display_name, draft_record.short_bio, draft_record.long_bio,
    draft_record.profile_photo_url, draft_record.portrait_photo_url, draft_record.languages, draft_record.therapy_approaches,
    draft_record.specializations, draft_record.education, draft_record.certificates, draft_record.modalities,
    draft_record.client_groups,
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

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;
