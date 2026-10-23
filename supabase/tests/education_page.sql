-- Edukacja's words in the CMS ('education_page'): seeded unpublished; an
-- admin edits and publishes them; a header without a title, or no word
-- about therapy, is refused by the database.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES (
  '58000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'education-page-admin@example.invalid',
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Education","last_name":"Admin"}',
  now(), now(), false, false
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('58000000-0000-4000-8000-000000000001', 'admin');

-- The seed (as the owner).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'education_page' AND published_payload IS NULL
      AND draft_payload ? 'therapyNote'
  ) THEN
    RAISE EXCEPTION 'S: education_page was not seeded unpublished';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"58000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  page jsonb;
BEGIN
  SELECT draft_payload INTO page FROM public.site_content
  WHERE key = 'education_page';

  UPDATE public.site_content
  SET draft_payload = jsonb_set(page, '{therapyNote}', '"Nowa uwaga."')
  WHERE key = 'education_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(page, '{articlesIntro,title}', '[[{"text": " ", "tone": "default"}]]')
    WHERE key = 'education_page';
    RAISE EXCEPTION 'V: Artykuły without a title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = page - 'therapyNote'
    WHERE key = 'education_page';
    RAISE EXCEPTION 'V: no word about therapy was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('education_page');
  IF (
    SELECT published_payload ->> 'therapyNote' FROM public.site_content
    WHERE key = 'education_page'
  ) IS DISTINCT FROM 'Nowa uwaga.' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
