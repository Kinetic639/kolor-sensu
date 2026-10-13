-- A new specialist's address on the site comes from their name (#26):
-- their row is made, with the account, before the name is known, so it
-- starts as "specialist-<account id>"; the first approved profile (with
-- the name) replaces that with "anna-kowalska" ("anna-kowalska-2" when
-- taken). The old address keeps redirecting, and an address the admin set
-- by hand is never replaced.

-- "Anna Żółkiewska-Nowak" → "anna-zolkiewska-nowak", free for this
-- specialist (not another's address, nor redirecting to another), or NULL
-- when the name gives too little.
CREATE OR REPLACE FUNCTION "private"."specialist_slug_from_name"("p_specialist_id" "uuid", "p_first_name" "text", "p_last_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
DECLARE
  v_base text;
  v_slug text;
  v_n integer := 1;
BEGIN
  v_base := translate(
    lower(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, '')),
    'ąćęłńóśźżáàâäãåçčďéèêëěíìîïľĺňñôöõőřšťúùûüůűýÿž',
    'acelnoszzaaaaaaccdeeeeeiiiillnnoooorstuuuuuuyyz'
  );
  v_base := btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-');
  v_base := btrim(left(v_base, 90), '-');
  IF char_length(v_base) < 3 THEN
    RETURN NULL;
  END IF;

  v_slug := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.specialists
    WHERE public_slug = v_slug AND id <> p_specialist_id
  ) OR EXISTS (
    SELECT 1 FROM public.specialist_slug_redirects
    WHERE old_slug = v_slug AND specialist_id <> p_specialist_id
  ) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  END LOOP;
  RETURN v_slug;
END;
$$;

ALTER FUNCTION "private"."specialist_slug_from_name"("p_specialist_id" "uuid", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."specialist_slug_from_name"("p_specialist_id" "uuid", "p_first_name" "text", "p_last_name" "text") FROM PUBLIC;

CREATE OR REPLACE FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  draft_record public.specialist_profile_drafts%ROWTYPE;
  v_slug text;
  v_named text;
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

  -- The address made with the account gives way to one from the name
  -- (#26); the old one keeps redirecting. One the admin set stays.
  SELECT specialist.public_slug INTO v_slug
  FROM public.specialists AS specialist
  WHERE specialist.id = draft_record.specialist_id
  FOR UPDATE;
  IF v_slug ~ '^specialist-[0-9a-f]{32}$' THEN
    v_named := private.specialist_slug_from_name(
      draft_record.specialist_id, draft_record.first_name, draft_record.last_name
    );
    IF v_named IS NOT NULL THEN
      DELETE FROM public.specialist_slug_redirects WHERE old_slug = v_named;
      UPDATE public.specialists SET public_slug = v_named
      WHERE id = draft_record.specialist_id;
      INSERT INTO public.specialist_slug_redirects (old_slug, specialist_id)
      VALUES (v_slug, draft_record.specialist_id)
      ON CONFLICT (old_slug) DO UPDATE
      SET specialist_id = EXCLUDED.specialist_id,
          created_at = now();
    END IF;
  END IF;

  UPDATE public.specialist_profile_drafts
  SET status = 'published',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_comment = nullif(trim(p_review_comment), '')
  WHERE id = p_draft_id;
END;
$$;


ALTER FUNCTION "public"."approve_specialist_profile_draft"("p_draft_id" "uuid", "p_review_comment" "text") OWNER TO "postgres";


