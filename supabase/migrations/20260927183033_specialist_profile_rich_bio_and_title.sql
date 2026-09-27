-- Specialists write their full bio as rich text and propose their own
-- professional title; both go through the same review as the rest of the
-- profile.
--
-- 1. long_bio becomes a RichTextDocument (a constrained Tiptap/ProseMirror
--    JSON subset, see docs/architecture/rich-text-platform.md) in drafts and
--    published profiles. Existing plain text is converted paragraph by
--    paragraph. The application validates the full structure; the database
--    guards the shape and size.
-- 2. Drafts carry professional_title; approval copies it to
--    specialists.professional_title, which the public profile shows.

CREATE FUNCTION private.plain_text_to_rich_text(value text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN coalesce(trim(value), '') = '' THEN
      '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    ELSE jsonb_build_object(
      'type', 'doc',
      'content', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', trim(line))
            )
          )
          ORDER BY position
        )
        FROM regexp_split_to_table(value, E'\\n+') WITH ORDINALITY AS lines(line, position)
        WHERE trim(line) <> ''
      )
    )
  END;
$$;

ALTER TABLE public.specialist_profile_drafts
  DROP CONSTRAINT specialist_profile_drafts_long_bio_length,
  ALTER COLUMN long_bio DROP DEFAULT,
  ALTER COLUMN long_bio TYPE jsonb USING private.plain_text_to_rich_text(long_bio),
  ALTER COLUMN long_bio SET DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  ADD CONSTRAINT specialist_profile_drafts_long_bio_document CHECK (
    jsonb_typeof(long_bio) = 'object'
    AND long_bio ->> 'type' = 'doc'
    AND octet_length(long_bio::text) <= 500000
  ),
  ADD COLUMN professional_title text,
  ADD CONSTRAINT specialist_profile_drafts_professional_title_length CHECK (
    professional_title IS NULL OR char_length(professional_title) <= 160
  );

ALTER TABLE public.specialist_public_profiles
  DROP CONSTRAINT specialist_public_profiles_long_bio_length,
  ALTER COLUMN long_bio DROP DEFAULT,
  ALTER COLUMN long_bio TYPE jsonb USING private.plain_text_to_rich_text(long_bio),
  ALTER COLUMN long_bio SET DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  ADD CONSTRAINT specialist_public_profiles_long_bio_document CHECK (
    jsonb_typeof(long_bio) = 'object'
    AND long_bio ->> 'type' = 'doc'
    AND octet_length(long_bio::text) <= 500000
  );

-- Open drafts start from the title the centre had set.
UPDATE public.specialist_profile_drafts AS draft
SET professional_title = specialist.professional_title
FROM public.specialists AS specialist
WHERE specialist.id = draft.specialist_id
  AND draft.status IN ('draft', 'pending_review', 'rejected');

DROP FUNCTION private.plain_text_to_rich_text(text);

DROP FUNCTION public.save_my_specialist_profile_draft(
  text, text, text, text, text, text[], text[], text[], text[], text[], text[]
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
  p_professional_title text DEFAULT NULL
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
      specializations, education, certificates, modalities
    ) VALUES (
      current_specialist_id, p_display_name, nullif(trim(p_professional_title), ''),
      p_short_bio, p_long_bio,
      p_profile_photo_url, p_portrait_photo_url, p_languages, p_therapy_approaches,
      p_specializations, p_education, p_certificates, p_modalities
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
        modalities = p_modalities
    WHERE id = current_draft_id;
  END IF;

  RETURN current_draft_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_my_specialist_profile_draft(
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_specialist_profile_draft(
  text, text, jsonb, text, text, text[], text[], text[], text[], text[], text[], text
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
