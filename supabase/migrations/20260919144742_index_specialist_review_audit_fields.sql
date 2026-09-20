CREATE INDEX specialist_profile_drafts_submitted_by_idx
ON public.specialist_profile_drafts (submitted_by)
WHERE submitted_by IS NOT NULL;

CREATE INDEX specialist_profile_drafts_reviewed_by_idx
ON public.specialist_profile_drafts (reviewed_by)
WHERE reviewed_by IS NOT NULL;

ALTER TABLE public.specialist_public_profiles
ADD CONSTRAINT specialist_public_profiles_media_ownership CHECK (
  (profile_photo_url IS NULL OR split_part(profile_photo_url, '/', 1) = specialist_id::text)
  AND (portrait_photo_url IS NULL OR split_part(portrait_photo_url, '/', 1) = specialist_id::text)
);

ALTER TABLE public.specialist_profile_drafts
ADD CONSTRAINT specialist_profile_drafts_media_ownership CHECK (
  (profile_photo_url IS NULL OR split_part(profile_photo_url, '/', 1) = specialist_id::text)
  AND (portrait_photo_url IS NULL OR split_part(portrait_photo_url, '/', 1) = specialist_id::text)
);
