-- A workshop's "Powiązane" (20261026170000, #185): the admin saves the
-- services and articles it points to with the workshop and reads them
-- back; a save without them keeps them; visitors read them once the
-- workshop is published, not while it is a draft. Rolled back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7e000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-related-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7e000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-related-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7e000000-0000-4000-8000-000000000001', 'admin'),
  ('7e000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Related Consultation', 'ws-related-consultation', 'consultation', 50, true, true, true);

CREATE TEMP TABLE rel (name text PRIMARY KEY, id uuid);
GRANT ALL ON rel TO authenticated, anon;
INSERT INTO rel VALUES
  ('leader', (SELECT id FROM public.specialists WHERE user_id = '7e000000-0000-4000-8000-000000000002')),
  ('service', (SELECT id FROM public.services WHERE slug = 'ws-related-consultation'));

SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_article uuid;
  v_id uuid;
  v_start timestamptz := ((current_date + 21) + time '17:00') AT TIME ZONE 'Europe/Warsaw';
  v_data jsonb;
  v_got jsonb;
BEGIN
  v_article := public.create_article(jsonb_build_object(
    'slug', 'ws-related-article', 'title', 'Powiązany artykuł', 'lead', '',
    'coverPath', null, 'coverAlt', '', 'categoryId', null,
    'body', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Treść."}]}]}'::jsonb,
    'authorKind', 'team', 'authorSpecialistId', null, 'reviewerSpecialistId', null,
    'sources', '[]'::jsonb, 'serviceIds', '[]'::jsonb, 'specialistIds', '[]'::jsonb,
    'ebookId', null, 'seoTitle', '', 'seoDescription', '', 'ogImagePath', null
  ));
  INSERT INTO rel VALUES ('article', v_article);

  v_data := jsonb_build_object(
    'slug', 'ws-related', 'title', 'Warsztat z powiązaniami',
    'short_description', 'Krótko',
    'specialist_id', (SELECT id FROM rel WHERE name = 'leader'),
    'modality', 'online', 'starts_at', v_start, 'ends_at', v_start + interval '2 hours',
    'price_minor', 0, 'capacity', 10,
    'service_ids', jsonb_build_array((SELECT id FROM rel WHERE name = 'service')),
    'article_ids', jsonb_build_array(v_article, v_article)
  );

  -- A: saved with the workshop, each once, and read back.
  v_id := public.save_workshop(NULL, v_data);
  INSERT INTO rel VALUES ('workshop', v_id);
  v_got := public.admin_get_workshop(v_id);
  IF v_got->'service_ids' <> jsonb_build_array((SELECT id FROM rel WHERE name = 'service'))
     OR v_got->'article_ids' <> jsonb_build_array(v_article) THEN
    RAISE EXCEPTION 'A: the picks were not saved: % / %', v_got->'service_ids', v_got->'article_ids';
  END IF;

  -- B: a save without them keeps them; an empty list removes them.
  PERFORM public.save_workshop(v_id, v_data - 'service_ids' - 'article_ids');
  IF jsonb_array_length(public.admin_get_workshop(v_id)->'service_ids') <> 1 THEN
    RAISE EXCEPTION 'B: a save without the picks dropped them';
  END IF;
  PERFORM public.save_workshop(v_id, v_data || '{"article_ids": []}'::jsonb);
  IF public.admin_get_workshop(v_id)->'article_ids' <> '[]'::jsonb
     OR jsonb_array_length(public.admin_get_workshop(v_id)->'service_ids') <> 1 THEN
    RAISE EXCEPTION 'B: an empty list did not clear only its picks';
  END IF;
  PERFORM public.save_workshop(v_id, v_data);
END;
$$;
RESET ROLE;

-- C: a visitor sees no picks of a draft.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.workshop_services WHERE workshop_id = (SELECT id FROM rel WHERE name = 'workshop'))
     OR EXISTS (SELECT 1 FROM public.workshop_articles WHERE workshop_id = (SELECT id FROM rel WHERE name = 'workshop')) THEN
    RAISE EXCEPTION 'C: a draft''s picks were readable';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.publish_workshop((SELECT id FROM rel WHERE name = 'workshop'));
RESET ROLE;

-- D: once published, a visitor reads them.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT service_id FROM public.workshop_services WHERE workshop_id = (SELECT id FROM rel WHERE name = 'workshop'))
       IS DISTINCT FROM (SELECT id FROM rel WHERE name = 'service')
     OR (SELECT article_id FROM public.workshop_articles WHERE workshop_id = (SELECT id FROM rel WHERE name = 'workshop'))
       IS DISTINCT FROM (SELECT id FROM rel WHERE name = 'article') THEN
    RAISE EXCEPTION 'D: a published workshop''s picks were not readable';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
