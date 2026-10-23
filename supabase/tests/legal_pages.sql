-- The legal documents (legal_terms, legal_privacy, legal_cookies). Seeded
-- unpublished with the sample documents; only admins edit and publish;
-- visitors read only what is published; a document that is not rich text,
-- or a page without its header or its date field, is refused.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '5a000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'legal-pages-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Legal","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '5a000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'legal-pages-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Legal","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5a000000-0000-4000-8000-000000000001', 'admin'),
  ('5a000000-0000-4000-8000-000000000002', 'specialist');

DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.site_content
    WHERE key IN ('legal_terms', 'legal_privacy', 'legal_cookies')
      AND published_payload IS NULL
      AND draft_payload #>> '{body,type}' = 'doc'
      AND draft_payload::text LIKE '%przykładowa treść%'
  ) <> 3 THEN
    RAISE EXCEPTION 'M: the three samples were not seeded unpublished';
  END IF;

  -- The cookie policy's sample follows the notice (20261021090000).
  IF (
    SELECT draft_payload::text FROM public.site_content WHERE key = 'legal_cookies'
  ) NOT LIKE '%ks_booking%Ustawienia plików cookies%' THEN
    RAISE EXCEPTION 'M: the cookie policy''s sample was not brought up to date';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"5a000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE public.site_content
  SET draft_payload = jsonb_set(draft_payload, '{effectiveFrom}', '"1 listopada 2026"')
  WHERE key = 'legal_terms';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{body}', '"<p>Regulamin</p>"')
    WHERE key = 'legal_terms';
    RAISE EXCEPTION 'V: a document that is not rich text was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{body}', '{"type": "doc", "content": []}')
    WHERE key = 'legal_privacy';
    RAISE EXCEPTION 'V: an empty document was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = draft_payload - 'effectiveFrom'
    WHERE key = 'legal_cookies';
    RAISE EXCEPTION 'V: a page without its date field was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{intro,title}', '[]')
    WHERE key = 'legal_cookies';
    RAISE EXCEPTION 'V: a page without its title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('legal_terms');
  IF (
    SELECT published_payload ->> 'effectiveFrom' FROM public.site_content
    WHERE key = 'legal_terms'
  ) IS DISTINCT FROM '1 listopada 2026' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"5a000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.site_content SET draft_payload = draft_payload WHERE key = 'legal_privacy';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the privacy policy';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('legal_privacy');
    RAISE EXCEPTION 'S: a specialist published the privacy policy';
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
    SELECT published_payload ->> 'effectiveFrom' FROM public.site_content
    WHERE key = 'legal_terms'
  ) IS DISTINCT FROM '1 listopada 2026' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published Regulamin';
  END IF;

  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'legal_cookies') THEN
    RAISE EXCEPTION 'R: a visitor saw the unpublished cookies page';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
