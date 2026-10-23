-- The offer pages' words (offer_page, service_page, prices_page). Seeded
-- unpublished; only admins edit and publish; visitors read only what is
-- published; content of the wrong shape is refused by the database.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '58000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'offer-pages-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Offer","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '58000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'offer-pages-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Offer","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('58000000-0000-4000-8000-000000000001', 'admin'),
  ('58000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner).
DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.site_content
    WHERE key IN ('offer_page', 'service_page', 'prices_page')
      AND published_payload IS NULL
  ) <> 3 THEN
    RAISE EXCEPTION 'M: the three new keys were not seeded unpublished';
  END IF;

  IF (
    SELECT jsonb_array_length(draft_payload -> 'rules') FROM public.site_content
    WHERE key = 'prices_page'
  ) IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'M: Cennik was not seeded with its four draft rules';
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
  nine_rules jsonb;
BEGIN
  UPDATE public.site_content
  SET draft_payload = jsonb_set(draft_payload, '{emptyText}', '"Wkrótce."')
  WHERE key = 'offer_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{intro,title}', '[[{"text": " ", "tone": "default"}]]')
    WHERE key = 'offer_page';
    RAISE EXCEPTION 'V: Oferta without its title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{unbooked,contactLabel}', '""')
    WHERE key = 'service_page';
    RAISE EXCEPTION 'V: a service''s contact button without words was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{rules,0,text}', '""')
    WHERE key = 'prices_page';
    RAISE EXCEPTION 'V: a price rule without words was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SELECT jsonb_agg(draft_payload -> 'rules' -> 0) INTO nine_rules
  FROM public.site_content, generate_series(1, 9)
  WHERE key = 'prices_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{rules}', nine_rules)
    WHERE key = 'prices_page';
    RAISE EXCEPTION 'V: nine price rules were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('offer_page');
  IF (
    SELECT published_payload ->> 'emptyText' FROM public.site_content
    WHERE key = 'offer_page'
  ) IS DISTINCT FROM 'Wkrótce.' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"58000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.site_content SET draft_payload = draft_payload WHERE key = 'prices_page';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited Cennik';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('service_page');
    RAISE EXCEPTION 'S: a specialist published the service pages';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT published_payload ->> 'emptyText' FROM public.site_content
    WHERE key = 'offer_page'
  ) IS DISTINCT FROM 'Wkrótce.' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published Oferta';
  END IF;

  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'prices_page') THEN
    RAISE EXCEPTION 'R: a visitor saw the unpublished Cennik';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
