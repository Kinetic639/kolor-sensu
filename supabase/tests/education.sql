-- Edukacja (20261021120000): articles, categories, e-books. Admins write
-- through the functions only; the draft is never readable but by them;
-- publishing checks the draft is complete, copies it, links its services
-- and specialists and keeps the old address as a redirect; visitors and
-- signed-in non-admins read published rows only; a category in use cannot
-- go; only admins add the samples' PDFs.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '5b000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'education-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Edu","last_name":"Admin"}', now(), now(), false, false
  ),
  (
    '5b000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'education-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Edu","last_name":"Specialist"}', now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5b000000-0000-4000-8000-000000000001', 'admin'),
  ('5b000000-0000-4000-8000-000000000002', 'specialist');

-- The specialist role gives the user a specialist row of its own.

INSERT INTO public.services (id, name, slug, default_duration_minutes)
VALUES ('5b000000-0000-4000-8000-0000000000b1', 'Konsultacja edu', 'konsultacja-edu', 50);

INSERT INTO public.article_categories (id, slug, name)
VALUES ('5b000000-0000-4000-8000-0000000000c1', 'lek', 'Lęk');

-- The test's draft: complete, by the specialist, with a service.
CREATE TEMP TABLE drafts (name text PRIMARY KEY, draft jsonb);
GRANT SELECT ON drafts TO authenticated, anon;
CREATE TEMP TABLE ids (name text PRIMARY KEY, id uuid);
GRANT ALL ON ids TO authenticated;
INSERT INTO drafts VALUES
  ('article', jsonb_build_object(
    'slug', 'czym-jest-lek',
    'title', 'Czym jest lęk',
    'lead', 'Lęk to naturalna reakcja.',
    'coverPath', 'articles/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a90.webp',
    'coverAlt', 'Gabinet',
    'categoryId', '5b000000-0000-4000-8000-0000000000c1',
    'body', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Treść artykułu."}]}]}'::jsonb,
    'authorKind', 'specialist',
    'authorSpecialistId', (
      SELECT id FROM public.specialists
      WHERE user_id = '5b000000-0000-4000-8000-000000000002'
    ),
    'reviewerSpecialistId', null,
    'sources', '[{"title":"WHO","url":"https://www.who.int"}]'::jsonb,
    'serviceIds', '["5b000000-0000-4000-8000-0000000000b1"]'::jsonb,
    'specialistIds', '[]'::jsonb,
    'ebookId', null,
    'seoTitle', '',
    'seoDescription', '',
    'ogImagePath', null
  )),
  ('ebook', jsonb_build_object(
    'slug', 'spokojny-sen',
    'title', 'Spokojny sen',
    'coverPath', 'ebooks/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a91.webp',
    'coverAlt', 'Okładka',
    'shortDescription', 'Jak lepiej spać.',
    'description', '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
    'audience', 'Dla osób z bezsennością.',
    'contents', '["Rozdział 1"]'::jsonb,
    'format', 'PDF, 40 stron',
    'naffyUrl', 'https://naffy.io/kolor-sensu/spokojny-sen',
    'showPrice', true,
    'videoUrl', '',
    'samplePath', 'ebooks/0b8c2f2e-5c4f-4c0a-9a1e-3f6c2d1b7a92.pdf',
    'seoTitle', '',
    'seoDescription', '',
    'ogImagePath', null
  ));

-- ------------------------------------------------------------ a specialist

SELECT set_config('request.jwt.claims',
  '{"sub":"5b000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.create_article((SELECT draft FROM drafts WHERE name = 'article'));
    RAISE EXCEPTION 'S: a specialist created an article';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.article_categories (slug, name) VALUES ('sen', 'Sen');
    RAISE EXCEPTION 'S: a specialist added a category';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"5b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  the_article uuid;
  the_ebook uuid;
  d jsonb := (SELECT draft FROM drafts WHERE name = 'article');
BEGIN
  -- Writes only through the functions.
  BEGIN
    INSERT INTO public.articles (draft) VALUES (d);
    RAISE EXCEPTION 'A: an article was inserted directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- A draft of the wrong shape.
  BEGIN
    PERFORM public.create_article(d || '{"slug": "Zły Adres"}');
    RAISE EXCEPTION 'V: a draft with a bad address was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.create_article(d || '{"coverPath": "https://x.pl/a.png"}');
    RAISE EXCEPTION 'V: a cover from another site was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- An incomplete draft is saved, not published.
  the_article := public.create_article(d || '{"lead": ""}');
  INSERT INTO ids VALUES ('article', the_article);
  BEGIN
    PERFORM public.publish_article(the_article);
    RAISE EXCEPTION 'P: an article without its lead was published';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'article_incomplete:lead' THEN RAISE; END IF;
  END;

  PERFORM public.save_article_draft(the_article, d);
  PERFORM public.publish_article(the_article);
  IF (SELECT status FROM public.articles WHERE id = the_article) <> 'published' THEN
    RAISE EXCEPTION 'P: the article was not published';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.article_services
    WHERE article_id = (SELECT id FROM ids WHERE name = 'article')
  ) THEN
    RAISE EXCEPTION 'P: the service was not linked';
  END IF;
  IF (SELECT has_unpublished_changes FROM public.list_articles_admin() WHERE id = the_article) THEN
    RAISE EXCEPTION 'P: a just-published article shows changes';
  END IF;

  -- Editing changes the draft only, and shows as changes.
  PERFORM public.save_article_draft(the_article, d || '{"title": "Lęk na co dzień"}');
  IF (SELECT title FROM public.articles WHERE id = the_article) <> 'Czym jest lęk' THEN
    RAISE EXCEPTION 'E: editing changed the published article';
  END IF;
  IF NOT (SELECT has_unpublished_changes FROM public.list_articles_admin() WHERE id = the_article) THEN
    RAISE EXCEPTION 'E: the changes did not show';
  END IF;

  -- A new address keeps the old one as a redirect.
  PERFORM public.save_article_draft(the_article, d || '{"slug": "lek-na-co-dzien"}');
  PERFORM public.publish_article(the_article);
  IF (SELECT article_id FROM public.article_slug_redirects WHERE old_slug = 'czym-jest-lek')
    IS DISTINCT FROM the_article THEN
    RAISE EXCEPTION 'R: the old address does not redirect';
  END IF;

  -- A category in use stays.
  BEGIN
    PERFORM public.delete_article_category('5b000000-0000-4000-8000-0000000000c1');
    RAISE EXCEPTION 'C: a category in use was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'category_in_use' THEN RAISE; END IF;
  END;

  -- A published article is not deleted.
  BEGIN
    PERFORM public.delete_article(the_article);
    RAISE EXCEPTION 'D: a published article was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'article_published' THEN RAISE; END IF;
  END;

  -- E-books.
  BEGIN
    PERFORM public.create_ebook((SELECT draft FROM drafts WHERE name = 'ebook') || '{"naffyUrl": "http://naffy.io/x"}');
    RAISE EXCEPTION 'V: a link to Naffy without https was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.create_ebook((SELECT draft FROM drafts WHERE name = 'ebook') || '{"videoUrl": "https://evil.example/v"}');
    RAISE EXCEPTION 'V: a film from elsewhere than YouTube or Vimeo was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.create_ebook((SELECT draft FROM drafts WHERE name = 'ebook') - 'showPrice');
    RAISE EXCEPTION 'V: an e-book without the price choice was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  the_ebook := public.create_ebook((SELECT draft FROM drafts WHERE name = 'ebook'));
  INSERT INTO ids VALUES ('ebook', the_ebook);
  PERFORM public.publish_ebook(the_ebook);
  IF (SELECT show_price FROM public.ebooks WHERE id = the_ebook) IS NOT TRUE THEN
    RAISE EXCEPTION 'P: publishing did not copy the price choice';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_ebooks_admin() WHERE has_unpublished_changes) THEN
    RAISE EXCEPTION 'P: a just published e-book has changes';
  END IF;

  -- The admin reads every article, its draft through the function only.
  IF (public.get_article_admin(the_article) #>> '{draft,title}') <> 'Czym jest lęk' THEN
    RAISE EXCEPTION 'A: the admin could not read the draft';
  END IF;
END;
$$;

DO $$
BEGIN
  PERFORM draft FROM public.articles;
  RAISE EXCEPTION 'A: the draft column was readable directly';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ a visitor

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.articles WHERE status = 'published') <> 1 THEN
    RAISE EXCEPTION 'V: a visitor did not see the published article';
  END IF;
  IF (SELECT slug FROM public.articles) <> 'lek-na-co-dzien' THEN
    RAISE EXCEPTION 'V: a visitor saw the wrong address';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.article_slug_redirects WHERE old_slug = 'czym-jest-lek') THEN
    RAISE EXCEPTION 'V: a visitor could not follow the old address';
  END IF;
  IF (SELECT count(*) FROM public.ebooks) <> 1 THEN
    RAISE EXCEPTION 'V: a visitor did not see the published e-book';
  END IF;
  IF (SELECT show_price FROM public.ebooks) IS NOT TRUE THEN
    RAISE EXCEPTION 'V: a visitor could not read whether to show the price';
  END IF;
  BEGIN
    PERFORM public.list_articles_admin();
    RAISE EXCEPTION 'V: a visitor listed the drafts';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- Unpublished: gone for visitors, its redirect too.
SELECT set_config('request.jwt.claims',
  '{"sub":"5b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.unpublish_article((SELECT id FROM ids WHERE name = 'article'));
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.articles) THEN
    RAISE EXCEPTION 'U: a visitor saw an unpublished article';
  END IF;
  IF EXISTS (SELECT 1 FROM public.article_slug_redirects) THEN
    RAISE EXCEPTION 'U: an unpublished article still redirected';
  END IF;
END;
$$;

RESET ROLE;

-- The samples' bucket: PDFs only, up to 20 MB, public.
DO $$
BEGIN
  IF (
    SELECT row(public, file_size_limit, allowed_mime_types)::text
    FROM storage.buckets WHERE id = 'site-downloads'
  ) IS DISTINCT FROM row(true, 20971520::bigint, ARRAY['application/pdf'])::text THEN
    RAISE EXCEPTION 'B: the samples bucket is not PDFs up to 20 MB';
  END IF;
END;
$$;

ROLLBACK;
