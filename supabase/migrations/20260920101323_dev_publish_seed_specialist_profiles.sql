-- DEV-only: run the two existing real specialist accounts through the
-- canonical draft -> submit -> approve workflow with neutral,
-- clearly-developmental placeholder content (no invented credentials,
-- education, certificates, specializations, languages, or modalities --
-- all array fields stay empty; professional_title is left untouched).

-- Specialist 1 (49fba7c7...): save + submit own draft.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"49fba7c7-0a9a-4cdd-a2f4-f7d869462113","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  draft_id uuid;
BEGIN
  SELECT public.save_my_specialist_profile_draft(
    p_display_name => 'Specjalista 1',
    p_short_bio => 'Profil testowy wykorzystywany do weryfikacji listy specjalistów.',
    p_long_bio => 'Profil testowy wykorzystywany do weryfikacji listy specjalistów.'
  ) INTO draft_id;
  PERFORM public.submit_my_specialist_profile_draft(draft_id);
END;
$$;

RESET ROLE;

-- Specialist 2 (1bc3b80a...): save + submit own draft.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"1bc3b80a-f9b5-4168-88b2-448dd2059b88","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  draft_id uuid;
BEGIN
  SELECT public.save_my_specialist_profile_draft(
    p_display_name => 'Specjalista 2',
    p_short_bio => 'Profil testowy wykorzystywany do weryfikacji listy specjalistów.',
    p_long_bio => 'Profil testowy wykorzystywany do weryfikacji listy specjalistów.'
  ) INTO draft_id;
  PERFORM public.submit_my_specialist_profile_draft(draft_id);
END;
$$;

RESET ROLE;

-- Admin (1bc3b80a...) approves specialist 1's draft via the real RPC --
-- no self-review conflict since the draft owner (49fba7c7) differs from
-- the reviewing admin (1bc3b80a).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"1bc3b80a-f9b5-4168-88b2-448dd2059b88","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  target_draft_id uuid;
BEGIN
  SELECT d.id INTO target_draft_id
  FROM public.specialist_profile_drafts d
  JOIN public.specialists s ON s.id = d.specialist_id
  WHERE s.user_id = '49fba7c7-0a9a-4cdd-a2f4-f7d869462113'
    AND d.status = 'pending_review';

  PERFORM public.approve_specialist_profile_draft(
    target_draft_id,
    'Zatwierdzono jako dane testowe DEV.'
  );
END;
$$;

RESET ROLE;

-- DEV-ONLY DOCUMENTED EXCEPTION for specialist 2 (1bc3b80a...): this
-- account is simultaneously the sole admin identity in this DEV
-- environment, so the existing approve_specialist_profile_draft RPC's
-- self-review guard ("Reviewers cannot approve their own profile") makes
-- it structurally impossible for them to approve their own draft through
-- the canonical workflow -- there is no second real admin account to do
-- it, and none was created per explicit instruction. The user was told
-- this precisely and explicitly asked to see both specialists published
-- in DEV regardless. This performs the exact same atomic effect the RPC
-- performs (copy draft into the canonical public profile, mark the draft
-- published, stamp reviewer/timestamp) directly at the trusted migration
-- layer, WITHOUT modifying the RPC or weakening its self-review guard --
-- that guard, and its existing regression test in specialist_domain.sql,
-- are untouched and still enforced for every normal caller.
DO $$
DECLARE
  draft_record public.specialist_profile_drafts%ROWTYPE;
BEGIN
  SELECT d.* INTO draft_record
  FROM public.specialist_profile_drafts d
  JOIN public.specialists s ON s.id = d.specialist_id
  WHERE s.user_id = '1bc3b80a-f9b5-4168-88b2-448dd2059b88'
    AND d.status = 'pending_review';

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
      reviewed_by = '1bc3b80a-f9b5-4168-88b2-448dd2059b88',
      review_comment = 'Zatwierdzono jako dane testowe DEV. Wyjątek: jedyne dostępne konto administratora jest tożsame ze specjalistą (self-review), więc zatwierdzenie wykonano poza RPC approve_specialist_profile_draft, bez zmiany reguły zabraniającej samo-recenzji.'
  WHERE id = draft_record.id;
END;
$$;
