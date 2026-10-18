-- Home → the sections' headers (site_content key 'home_headers'): seeded
-- with the words the site shows, "Pierwszy krok" and "Z kim porozmawiasz"
-- moved out of their own payloads; only admins edit and publish; visitors
-- read only what is published; a header of the wrong shape (three lines,
-- an empty line, a colour or style not on the list, two links, a section
-- missing) is refused by the database itself. The homepage has no
-- questions and answers, so no header for them.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '54000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'headers-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Headers","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '54000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'headers-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Headers","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('54000000-0000-4000-8000-000000000001', 'admin'),
  ('54000000-0000-4000-8000-000000000002', 'specialist');

-- The seed and the move (as the owner: the payloads as stored).
DO $$
BEGIN
  IF (
    SELECT draft_payload -> 'firstSteps' -> 'title' -> 0 -> 0 ->> 'text'
    FROM public.site_content WHERE key = 'home_headers'
  ) IS DISTINCT FROM 'Od pierwszego kontaktu do wsparcia na dłużej' THEN
    RAISE EXCEPTION 'M: the first steps'' heading did not move to the headers';
  END IF;

  IF (
    SELECT published_payload -> 'spotlight' -> 'title' -> 0 -> 0 ->> 'text'
    FROM public.site_content WHERE key = 'home_headers'
  ) IS DISTINCT FROM 'Z kim porozmawiasz' THEN
    RAISE EXCEPTION 'M: the headers were not published as the site shows them';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'first_steps' AND (draft_payload ? 'heading' OR draft_payload ? 'eyebrow')
  ) OR EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'home_sections' AND draft_payload -> 'spotlight' ? 'heading'
  ) THEN
    RAISE EXCEPTION 'M: the moved words stayed in their old places';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'home_headers'
      AND (draft_payload ? 'faq' OR published_payload ? 'faq')
  ) THEN
    RAISE EXCEPTION 'M: the homepage kept a header for questions and answers';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  headers jsonb;
  coloured jsonb := jsonb_build_object(
    'eyebrow', jsonb_build_object('text', 'Jak zacząć', 'tone', 'pink'),
    'title', jsonb_build_array(
      jsonb_build_array(
        jsonb_build_object('text', 'Twoja droga do ', 'tone', 'default'),
        jsonb_build_object('text', 'lepszego', 'tone', 'green')
      ),
      jsonb_build_array(jsonb_build_object('text', 'samopoczucia', 'tone', 'default'))
    ),
    'description', jsonb_build_array(
      jsonb_build_object('text', 'Zacznij od ', 'link', NULL),
      jsonb_build_object(
        'text', 'rozmowy',
        'link', jsonb_build_object('href', '/umow-wizyte', 'tone', 'pink')
      )
    ),
    'cta', jsonb_build_object('label', 'Oferta', 'href', '/oferta', 'style', 'button')
  );
  line jsonb := jsonb_build_array(jsonb_build_object('text', 'Słowo', 'tone', 'default'));
  link jsonb := jsonb_build_object('href', '/oferta', 'tone', 'default');
BEGIN
  SELECT draft_payload INTO headers
  FROM public.site_content WHERE key = 'home_headers';

  UPDATE public.site_content
  SET draft_payload = jsonb_set(headers, '{story}', coloured)
  WHERE key = 'home_headers';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      headers, '{story,title}', jsonb_build_array(line, line, line)
    )
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: a title of three lines was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      headers, '{story,title}', jsonb_build_array('[]'::jsonb)
    )
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: an empty title line was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(headers, '{story,eyebrow,tone}', '"#ff0000"')
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: a colour off the list was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      headers, '{story,description}',
      jsonb_build_array(
        jsonb_build_object('text', 'jeden', 'link', link),
        jsonb_build_object('text', 'drugi', 'link', link)
      )
    )
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: two links were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      headers, '{story,cta}',
      jsonb_build_object('label', 'Oferta', 'href', '/oferta', 'style', 'neon')
    )
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: a call to action style off the list was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = headers - 'story'
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: headers without a section were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('home_headers');

  IF (
    SELECT published_payload -> 'story' -> 'title' -> 0 -> 1 ->> 'tone'
    FROM public.site_content WHERE key = 'home_headers'
  ) IS DISTINCT FROM 'green' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"54000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'home_headers') THEN
    RAISE EXCEPTION 'S: a specialist read the headers draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'home_headers';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the headers';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT published_payload -> 'story' -> 'eyebrow' ->> 'tone'
    FROM public.site_content WHERE key = 'home_headers'
  ) IS DISTINCT FROM 'pink' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published headers';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'home_headers';
    RAISE EXCEPTION 'R: a visitor read the headers draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
