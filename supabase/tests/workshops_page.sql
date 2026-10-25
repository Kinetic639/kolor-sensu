-- Warsztaty's words in the CMS ('workshops_page', #210): seeded
-- unpublished; an admin edits and publishes them; a header without a
-- title, or no line for an empty list, is refused by the database.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES (
  '59000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'workshops-page-admin@example.invalid',
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Workshops","last_name":"Admin"}',
  now(), now(), false, false
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('59000000-0000-4000-8000-000000000001', 'admin');

-- The seed (as the owner).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'workshops_page' AND published_payload IS NULL
      AND draft_payload ? 'emptyText'
  ) THEN
    RAISE EXCEPTION 'S: workshops_page was not seeded unpublished';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"59000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  page jsonb;
BEGIN
  SELECT draft_payload INTO page FROM public.site_content
  WHERE key = 'workshops_page';

  UPDATE public.site_content
  SET draft_payload = jsonb_set(page, '{emptyText}', '"Wkrótce nowe terminy."')
  WHERE key = 'workshops_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(page, '{intro,title}', '[[{"text": " ", "tone": "default"}]]')
    WHERE key = 'workshops_page';
    RAISE EXCEPTION 'V: Warsztaty without a title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(page, '{emptyText}', '" "')
    WHERE key = 'workshops_page';
    RAISE EXCEPTION 'V: no line for an empty list was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('workshops_page');
  IF (
    SELECT published_payload ->> 'emptyText' FROM public.site_content
    WHERE key = 'workshops_page'
  ) IS DISTINCT FROM 'Wkrótce nowe terminy.' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
