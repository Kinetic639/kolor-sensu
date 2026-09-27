-- The centre starts with a single admin who is also a specialist, so an admin
-- must be able to review their own profile draft. Review metadata
-- (reviewed_by, reviewed_at, review_comment) still records who decided.
-- Same functions as in 20260919143322_specialist_domain_foundation.sql,
-- without the self-review check. Grants are kept by CREATE OR REPLACE.

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

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_specialist_profile_draft(
  p_draft_id uuid,
  p_review_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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

  UPDATE public.specialist_profile_drafts
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = trim(p_review_comment)
  WHERE id = p_draft_id
    AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending draft not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
