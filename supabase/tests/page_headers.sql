-- A page's header in a section's header's shape (20261020170000): every
-- page's header is rewritten from its four words, keeping its look; the
-- database takes only one or two title lines, the first not blank, and no
-- call to action, and no longer the four words.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES (
  '59000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
  'page-headers-admin@example.invalid',
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Page","last_name":"Admin"}',
  now(), now(), false, false
);

INSERT INTO public.user_roles (user_id, role)
VALUES ('59000000-0000-4000-8000-000000000001', 'admin');

-- The rewrite (as the owner): the seeded drafts, in the new shape.
DO $$
DECLARE
  page record;
BEGIN
  FOR page IN
    SELECT key, draft_payload -> 'intro' AS intro FROM public.site_content
    WHERE key IN (
      'about_page', 'specialists_page', 'contact_page', 'offer_page',
      'prices_page'
    )
  LOOP
    IF page.intro ? 'heading' OR NOT private.page_intro_is_valid(page.intro) THEN
      RAISE EXCEPTION 'M: % kept the four words', page.key;
    END IF;
  END LOOP;

  IF (
    SELECT row(
      draft_payload #>> '{intro,eyebrow,tone}',
      draft_payload #>> '{intro,title,0,0,text}',
      draft_payload #>> '{intro,title,1,0,tone}',
      jsonb_typeof(draft_payload #> '{intro,cta}')
    )::text
    FROM public.site_content WHERE key = 'offer_page'
  ) IS DISTINCT FROM row('pink', 'Oferta', 'green', 'null')::text THEN
    RAISE EXCEPTION 'M: Oferta''s header did not keep its look';
  END IF;

  IF (
    SELECT draft_payload #>> '{intro,description,0,text}'
    FROM public.site_content WHERE key = 'prices_page'
  ) IS NULL THEN
    RAISE EXCEPTION 'M: Cennik''s lead was lost';
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
BEGIN
  -- Any words in another colour, on two lines.
  UPDATE public.site_content
  SET draft_payload = jsonb_set(
    draft_payload, '{intro,title}',
    '[[{"text": "Spokojnie, ", "tone": "default"}, {"text": "uważnie", "tone": "pink"}],
      [{"text": "i z sensem.", "tone": "green"}]]'
  )
  WHERE key = 'about_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      draft_payload, '{intro}',
      '{"eyebrow": "", "heading": "Kontakt", "accent": "", "lead": ""}'
    )
    WHERE key = 'contact_page';
    RAISE EXCEPTION 'V: the four words were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      draft_payload, '{intro,cta}',
      '{"label": "Umów", "href": "/umow-wizyte", "style": "button"}'
    )
    WHERE key = 'offer_page';
    RAISE EXCEPTION 'V: a page''s header with a call to action was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      draft_payload, '{intro,title}',
      '[[{"text": "Jeden", "tone": "default"}], [{"text": "Dwa", "tone": "default"}],
        [{"text": "Trzy", "tone": "default"}]]'
    )
    WHERE key = 'prices_page';
    RAISE EXCEPTION 'V: three title lines were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      draft_payload, '{intro}',
      '{"eyebrow": {"text": "", "tone": "default"},
        "title": [[{"text": "Gabinety", "tone": "blue"}]],
        "description": [], "cta": null}'
    )
    WHERE key = 'rooms';
    RAISE EXCEPTION 'V: a colour outside the theme was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
