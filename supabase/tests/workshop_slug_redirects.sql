-- A workshop's old address (20261025140000, #184): a published workshop's
-- old address leads to its new one, also after a second change; a draft's
-- does not; a workshop taking an address stops it redirecting; anyone may
-- ask. Rolled back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7f100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-slug-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES ('7f100000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online', w.at, w.at + interval '2 hours',
  10000, 5, true, w.status::public.workshop_status
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-slug-stary', 'Opublikowany', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 'published'),
  ('ws-slug-szkic', 'Szkic', ((current_date + 21) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 'draft')
) AS w(slug, title, at, status)
WHERE specialist.user_id = '7f100000-0000-4000-8000-000000000002';

-- A: the published one moves twice; both old addresses lead to the last.
UPDATE public.workshops SET slug = 'ws-slug-nowy' WHERE slug = 'ws-slug-stary';
UPDATE public.workshops SET slug = 'ws-slug-najnowszy' WHERE slug = 'ws-slug-nowy';
-- B: the draft moves: nothing to redirect.
UPDATE public.workshops SET slug = 'ws-slug-szkic-2' WHERE slug = 'ws-slug-szkic';

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF public.workshop_redirect('ws-slug-stary') IS DISTINCT FROM 'ws-slug-najnowszy'
     OR public.workshop_redirect('ws-slug-nowy') IS DISTINCT FROM 'ws-slug-najnowszy' THEN
    RAISE EXCEPTION 'A: an old address does not lead to the new one';
  END IF;
  IF public.workshop_redirect('ws-slug-szkic') IS NOT NULL THEN
    RAISE EXCEPTION 'B: a draft''s old address redirects';
  END IF;
  IF public.workshop_redirect('ws-slug-nigdy') IS NOT NULL THEN
    RAISE EXCEPTION 'A: an unknown address redirects';
  END IF;
END;
$$;
RESET ROLE;

-- C: another workshop takes an old address: it stops redirecting.
UPDATE public.workshops SET slug = 'ws-slug-stary' WHERE slug = 'ws-slug-szkic-2';
DO $$
BEGIN
  IF public.workshop_redirect('ws-slug-stary') IS NOT NULL THEN
    RAISE EXCEPTION 'C: a taken address still redirects';
  END IF;
  IF public.workshop_redirect('ws-slug-nowy') IS DISTINCT FROM 'ws-slug-najnowszy' THEN
    RAISE EXCEPTION 'C: the other old address lost its redirect';
  END IF;
END;
$$;

ROLLBACK;
