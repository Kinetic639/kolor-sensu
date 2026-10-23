-- Edukacja: articles, their categories and e-books (docs/product/
-- education-plan.md, PR 2; docs/architecture/education-domain.md).
--
-- An article (and an e-book) is one row: its published version in typed
-- columns, which the site reads, lists and filters by, and its working
-- version in `draft` (jsonb), which only admins see. Editing changes the
-- draft only; publishing copies it to the columns (checking that it is
-- complete), so a published article stays as it was until published again.
-- A changed address leaves a redirect behind.
--
-- Visitors and signed-in non-admins read published rows only, and never
-- the draft column. Every write goes through the functions below, which
-- check the admin role; the tables take no direct writes.
-- Categories are plain rows, written by admins; one still in use cannot be
-- deleted. The e-books' free samples (PDF) live in a public bucket of
-- their own.

-- ------------------------------------------------------------ the checks

CREATE OR REPLACE FUNCTION private.is_slug(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    p_value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(p_value) BETWEEN 3 AND 120,
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.is_uuid_text(p_value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_value) = 'string'
    AND (p_value #>> '{}') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
    false
  );
$$;

-- A short text field: a string of at most p_max characters.
CREATE OR REPLACE FUNCTION private.is_text(p_value jsonb, p_max integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_value) = 'string'
    AND char_length(p_value #>> '{}') <= p_max,
    false
  );
$$;

-- A rich text document's outline (its full check is the contracts', on
-- save): a "doc" with at least one block.
CREATE OR REPLACE FUNCTION private.is_rich_text(p_value jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_value) = 'object'
    AND p_value ->> 'type' = 'doc'
    AND jsonb_typeof(p_value -> 'content') = 'array'
    AND jsonb_array_length(p_value -> 'content') >= 1
    AND octet_length(p_value::text) <= 600000,
    false
  );
$$;

-- A list of ids (at most p_max).
CREATE OR REPLACE FUNCTION private.is_uuid_list(p_value jsonb, p_max integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_value) = 'array'
    AND jsonb_array_length(p_value) <= p_max
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_value) AS item
      WHERE NOT private.is_uuid_text(item)
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION private.is_image_path(p_value jsonb, p_folder text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_value) = 'null'
    OR (
      jsonb_typeof(p_value) = 'string'
      AND (p_value #>> '{}') ~ ('^' || p_folder || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    ),
    false
  );
$$;

-- An article's working version (the contracts' ArticleDraft).
CREATE OR REPLACE FUNCTION private.article_draft_is_valid(p_draft jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_draft) = 'object'
    AND private.is_slug(p_draft ->> 'slug')
    AND private.is_text(p_draft -> 'title', 160)
    AND private.is_text(p_draft -> 'lead', 400)
    AND private.is_image_path(p_draft -> 'coverPath', 'articles')
    AND private.is_text(p_draft -> 'coverAlt', 300)
    AND (jsonb_typeof(p_draft -> 'categoryId') = 'null' OR private.is_uuid_text(p_draft -> 'categoryId'))
    AND private.is_rich_text(p_draft -> 'body')
    AND (p_draft ->> 'authorKind') IN ('specialist', 'team')
    AND (jsonb_typeof(p_draft -> 'authorSpecialistId') = 'null' OR private.is_uuid_text(p_draft -> 'authorSpecialistId'))
    AND (jsonb_typeof(p_draft -> 'reviewerSpecialistId') = 'null' OR private.is_uuid_text(p_draft -> 'reviewerSpecialistId'))
    AND jsonb_typeof(p_draft -> 'sources') = 'array'
    AND jsonb_array_length(p_draft -> 'sources') <= 30
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_draft -> 'sources') AS source
      WHERE NOT private.is_text(source -> 'title', 300)
        OR NOT private.is_text(source -> 'url', 2048)
    )
    AND private.is_uuid_list(p_draft -> 'serviceIds', 10)
    AND private.is_uuid_list(p_draft -> 'specialistIds', 10)
    AND (jsonb_typeof(p_draft -> 'ebookId') = 'null' OR private.is_uuid_text(p_draft -> 'ebookId'))
    AND private.is_text(p_draft -> 'seoTitle', 70)
    AND private.is_text(p_draft -> 'seoDescription', 160)
    AND private.is_image_path(p_draft -> 'ogImagePath', 'articles'),
    false
  );
$$;

-- An e-book's working version (the contracts' EbookDraft).
CREATE OR REPLACE FUNCTION private.ebook_draft_is_valid(p_draft jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    jsonb_typeof(p_draft) = 'object'
    AND private.is_slug(p_draft ->> 'slug')
    AND private.is_text(p_draft -> 'title', 160)
    AND private.is_image_path(p_draft -> 'coverPath', 'ebooks')
    AND private.is_text(p_draft -> 'coverAlt', 300)
    AND private.is_text(p_draft -> 'shortDescription', 300)
    AND private.is_rich_text(p_draft -> 'description')
    AND private.is_text(p_draft -> 'audience', 600)
    AND jsonb_typeof(p_draft -> 'contents') = 'array'
    AND jsonb_array_length(p_draft -> 'contents') <= 40
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_draft -> 'contents') AS item
      WHERE NOT private.is_text(item, 200)
    )
    AND private.is_text(p_draft -> 'format', 120)
    AND private.is_text(p_draft -> 'naffyUrl', 2048)
    AND coalesce((p_draft ->> 'naffyUrl') = '' OR (p_draft ->> 'naffyUrl') ~ '^https://[^/\s]+(/\S*)?$', false)
    AND private.is_text(p_draft -> 'videoUrl', 300)
    AND coalesce(
      (p_draft ->> 'videoUrl') = ''
      OR (p_draft ->> 'videoUrl') ~ '^https://(www\.)?(youtube\.com/watch\?v=|youtu\.be/|vimeo\.com/)[A-Za-z0-9_-]+',
      false
    )
    AND (
      jsonb_typeof(p_draft -> 'samplePath') = 'null'
      OR (p_draft ->> 'samplePath') ~ '^ebooks/[0-9a-f-]{36}\.pdf$'
    )
    AND private.is_text(p_draft -> 'seoTitle', 70)
    AND private.is_text(p_draft -> 'seoDescription', 160)
    AND private.is_image_path(p_draft -> 'ogImagePath', 'ebooks'),
    false
  );
$$;

-- ------------------------------------------------------------ the tables

CREATE TABLE public.article_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (private.is_slug(slug)),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft jsonb NOT NULL CHECK (private.ebook_draft_is_valid(draft)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- The published version (null until first published).
  slug text UNIQUE CHECK (slug IS NULL OR private.is_slug(slug)),
  title text,
  cover_path text,
  cover_alt text,
  short_description text,
  description jsonb,
  audience text,
  contents jsonb,
  format text,
  naffy_url text,
  video_url text,
  sample_path text,
  seo_title text,
  seo_description text,
  og_image_path text,
  published_at timestamptz,
  content_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ebooks_published_complete CHECK (
    status = 'draft'
    OR (slug IS NOT NULL AND title IS NOT NULL AND cover_path IS NOT NULL
      AND naffy_url IS NOT NULL AND published_at IS NOT NULL)
  )
);

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft jsonb NOT NULL CHECK (private.article_draft_is_valid(draft)),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- The published version (null until first published).
  slug text UNIQUE CHECK (slug IS NULL OR private.is_slug(slug)),
  title text,
  lead text,
  cover_path text,
  cover_alt text,
  category_id uuid REFERENCES public.article_categories (id) ON DELETE RESTRICT,
  body jsonb,
  author_kind text CHECK (author_kind IS NULL OR author_kind IN ('specialist', 'team')),
  author_specialist_id uuid REFERENCES public.specialists (id) ON DELETE SET NULL,
  reviewer_specialist_id uuid REFERENCES public.specialists (id) ON DELETE SET NULL,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ebook_id uuid REFERENCES public.ebooks (id) ON DELETE SET NULL,
  seo_title text,
  seo_description text,
  og_image_path text,
  published_at timestamptz,
  content_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT articles_published_complete CHECK (
    status = 'draft'
    OR (slug IS NOT NULL AND title IS NOT NULL AND cover_path IS NOT NULL
      AND category_id IS NOT NULL AND body IS NOT NULL
      AND author_kind IS NOT NULL AND published_at IS NOT NULL)
  )
);

CREATE INDEX articles_published_listing
  ON public.articles (category_id, published_at DESC) WHERE status = 'published';
CREATE INDEX articles_author ON public.articles (author_specialist_id);
CREATE INDEX articles_reviewer ON public.articles (reviewer_specialist_id);
CREATE INDEX articles_ebook ON public.articles (ebook_id);

-- The published version's services and specialists (written on publish).
CREATE TABLE public.article_services (
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, service_id)
);
CREATE INDEX article_services_service ON public.article_services (service_id);

CREATE TABLE public.article_specialists (
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, specialist_id)
);
CREATE INDEX article_specialists_specialist ON public.article_specialists (specialist_id);

CREATE TABLE public.article_slug_redirects (
  old_slug text PRIMARY KEY CHECK (private.is_slug(old_slug)),
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.ebook_slug_redirects (
  old_slug text PRIMARY KEY CHECK (private.is_slug(old_slug)),
  ebook_id uuid NOT NULL REFERENCES public.ebooks (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_article_categories_updated_at BEFORE UPDATE ON public.article_categories
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER set_articles_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();
CREATE TRIGGER set_ebooks_updated_at BEFORE UPDATE ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ------------------------------------------------------------ who reads

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_slug_redirects ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.article_categories, public.articles, public.ebooks,
  public.article_services, public.article_specialists,
  public.article_slug_redirects, public.ebook_slug_redirects
  FROM anon, authenticated;

GRANT SELECT ON public.article_categories TO anon, authenticated;
GRANT INSERT, UPDATE ON public.article_categories TO authenticated;

-- Everything but the draft.
GRANT SELECT (
  id, status, slug, title, lead, cover_path, cover_alt, category_id, body,
  author_kind, author_specialist_id, reviewer_specialist_id, sources, ebook_id,
  seo_title, seo_description, og_image_path, published_at, content_updated_at,
  created_at, updated_at
) ON public.articles TO anon, authenticated;

GRANT SELECT (
  id, status, slug, title, cover_path, cover_alt, short_description,
  description, audience, contents, format, naffy_url, video_url, sample_path,
  seo_title, seo_description, og_image_path, published_at, content_updated_at,
  created_at, updated_at
) ON public.ebooks TO anon, authenticated;

GRANT SELECT ON public.article_services, public.article_specialists,
  public.article_slug_redirects, public.ebook_slug_redirects
  TO anon, authenticated;

CREATE POLICY "Anyone reads the categories" ON public.article_categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins add categories" ON public.article_categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins change categories" ON public.article_categories
  FOR UPDATE TO authenticated
  USING (public.has_role('admin'::public.app_role))
  WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Visitors read published articles" ON public.articles
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Signed-in users read published articles; admins all" ON public.articles
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role('admin'::public.app_role));

CREATE POLICY "Visitors read published e-books" ON public.ebooks
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "Signed-in users read published e-books; admins all" ON public.ebooks
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role('admin'::public.app_role));

CREATE POLICY "Links of published articles are readable" ON public.article_services
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.articles AS article
    WHERE article.id = article_id AND article.status = 'published'
  ));
CREATE POLICY "Links of published articles are readable" ON public.article_specialists
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.articles AS article
    WHERE article.id = article_id AND article.status = 'published'
  ));
CREATE POLICY "Redirects to published articles are readable" ON public.article_slug_redirects
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.articles AS article
    WHERE article.id = article_id AND article.status = 'published'
  ));
CREATE POLICY "Redirects to published e-books are readable" ON public.ebook_slug_redirects
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.ebooks AS ebook
    WHERE ebook.id = ebook_id AND ebook.status = 'published'
  ));

-- ------------------------------------------------------------ admin: articles

CREATE OR REPLACE FUNCTION private.require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins manage Edukacja' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- The published version as a draft, to tell whether the draft changed it.
CREATE OR REPLACE FUNCTION private.article_published_as_draft(p_article public.articles)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'slug', p_article.slug,
    'title', p_article.title,
    'lead', p_article.lead,
    'coverPath', p_article.cover_path,
    'coverAlt', p_article.cover_alt,
    'categoryId', p_article.category_id,
    'body', p_article.body,
    'authorKind', p_article.author_kind,
    'authorSpecialistId', p_article.author_specialist_id,
    'reviewerSpecialistId', p_article.reviewer_specialist_id,
    'sources', p_article.sources,
    'serviceIds', coalesce((
      SELECT jsonb_agg(link.service_id ORDER BY link.service_id)
      FROM public.article_services AS link WHERE link.article_id = p_article.id
    ), '[]'::jsonb),
    'specialistIds', coalesce((
      SELECT jsonb_agg(link.specialist_id ORDER BY link.specialist_id)
      FROM public.article_specialists AS link WHERE link.article_id = p_article.id
    ), '[]'::jsonb),
    'ebookId', p_article.ebook_id,
    'seoTitle', p_article.seo_title,
    'seoDescription', p_article.seo_description,
    'ogImagePath', p_article.og_image_path
  );
$$;

CREATE OR REPLACE FUNCTION private.sorted_ids(p_ids jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(
    (SELECT jsonb_agg(DISTINCT id ORDER BY id) FROM jsonb_array_elements_text(p_ids) AS id),
    '[]'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.create_article(p_draft jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM private.require_admin();
  INSERT INTO public.articles (draft) VALUES (p_draft) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_article_draft(p_id uuid, p_draft jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.articles SET draft = p_draft WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Every article for the admin: the draft's title and category, whether
-- the draft has changes not yet published.
CREATE OR REPLACE FUNCTION public.list_articles_admin()
RETURNS TABLE (
  id uuid,
  status text,
  draft jsonb,
  slug text,
  published_at timestamptz,
  updated_at timestamptz,
  has_unpublished_changes boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT article.id, article.status, article.draft, article.slug,
    article.published_at, article.updated_at,
    article.status <> 'published'
      OR (article.draft || jsonb_build_object(
            'serviceIds', private.sorted_ids(article.draft -> 'serviceIds'),
            'specialistIds', private.sorted_ids(article.draft -> 'specialistIds')))
        IS DISTINCT FROM private.article_published_as_draft(article)
  FROM public.articles AS article
  ORDER BY article.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_article_admin(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM private.require_admin();
  SELECT jsonb_build_object(
    'id', article.id,
    'status', article.status,
    'draft', article.draft,
    'slug', article.slug,
    'publishedAt', article.published_at,
    'contentUpdatedAt', article.content_updated_at,
    'updatedAt', article.updated_at
  )
  INTO result
  FROM public.articles AS article WHERE article.id = p_id;
  RETURN result;
END;
$$;

-- Publishes the draft: refuses an incomplete one (SQLSTATE P0001, message
-- 'article_incomplete:<what>'), keeps the old address as a redirect.
CREATE OR REPLACE FUNCTION public.publish_article(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  article public.articles;
  d jsonb;
  new_slug text;
BEGIN
  PERFORM private.require_admin();
  SELECT * INTO article FROM public.articles WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Article not found' USING ERRCODE = 'P0002';
  END IF;
  d := article.draft;
  new_slug := d ->> 'slug';

  IF btrim(d ->> 'title') = '' THEN RAISE EXCEPTION 'article_incomplete:title'; END IF;
  IF btrim(d ->> 'lead') = '' THEN RAISE EXCEPTION 'article_incomplete:lead'; END IF;
  IF jsonb_typeof(d -> 'coverPath') <> 'string' OR btrim(d ->> 'coverAlt') = '' THEN
    RAISE EXCEPTION 'article_incomplete:cover';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.article_categories WHERE id = (d ->> 'categoryId')::uuid
  ) THEN
    RAISE EXCEPTION 'article_incomplete:category';
  END IF;
  IF NOT (d -> 'body')::text ~ '"text"\s*:\s*"[^"]*\S' THEN
    RAISE EXCEPTION 'article_incomplete:body';
  END IF;
  IF d ->> 'authorKind' = 'specialist' AND NOT EXISTS (
    SELECT 1 FROM public.specialists WHERE id = (d ->> 'authorSpecialistId')::uuid
  ) THEN
    RAISE EXCEPTION 'article_incomplete:author';
  END IF;
  IF EXISTS (SELECT 1 FROM public.articles WHERE slug = new_slug AND id <> p_id) THEN
    RAISE EXCEPTION 'article_slug_taken';
  END IF;

  -- The address: the new one stops redirecting; the old one redirects here.
  DELETE FROM public.article_slug_redirects WHERE old_slug = new_slug;
  IF article.slug IS NOT NULL AND article.slug <> new_slug THEN
    INSERT INTO public.article_slug_redirects (old_slug, article_id)
    VALUES (article.slug, p_id)
    ON CONFLICT (old_slug) DO UPDATE
    SET article_id = EXCLUDED.article_id, created_at = now();
  END IF;

  UPDATE public.articles SET
    status = 'published',
    slug = new_slug,
    title = d ->> 'title',
    lead = d ->> 'lead',
    cover_path = d ->> 'coverPath',
    cover_alt = d ->> 'coverAlt',
    category_id = (d ->> 'categoryId')::uuid,
    body = d -> 'body',
    author_kind = d ->> 'authorKind',
    author_specialist_id = CASE
      WHEN d ->> 'authorKind' = 'specialist' THEN (d ->> 'authorSpecialistId')::uuid
    END,
    reviewer_specialist_id = (
      SELECT id FROM public.specialists WHERE id = (d ->> 'reviewerSpecialistId')::uuid
    ),
    sources = d -> 'sources',
    ebook_id = (SELECT id FROM public.ebooks WHERE id = (d ->> 'ebookId')::uuid),
    seo_title = d ->> 'seoTitle',
    seo_description = d ->> 'seoDescription',
    og_image_path = d ->> 'ogImagePath',
    published_at = coalesce(published_at, now()),
    content_updated_at = now()
  WHERE id = p_id;

  DELETE FROM public.article_services WHERE article_id = p_id;
  INSERT INTO public.article_services (article_id, service_id)
  SELECT p_id, service.id FROM public.services AS service
  WHERE service.id IN (SELECT value::uuid FROM jsonb_array_elements_text(d -> 'serviceIds'));

  DELETE FROM public.article_specialists WHERE article_id = p_id;
  INSERT INTO public.article_specialists (article_id, specialist_id)
  SELECT p_id, specialist.id FROM public.specialists AS specialist
  WHERE specialist.id IN (SELECT value::uuid FROM jsonb_array_elements_text(d -> 'specialistIds'));
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_article(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.articles SET status = 'draft' WHERE id = p_id;
END;
$$;

-- Only an article not on the site may be deleted.
CREATE OR REPLACE FUNCTION public.delete_article(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF EXISTS (SELECT 1 FROM public.articles WHERE id = p_id AND status = 'published') THEN
    RAISE EXCEPTION 'article_published';
  END IF;
  DELETE FROM public.articles WHERE id = p_id;
END;
$$;

-- A category in use (by an article's draft or its published version)
-- cannot be deleted.
CREATE OR REPLACE FUNCTION public.delete_article_category(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF EXISTS (
    SELECT 1 FROM public.articles
    WHERE category_id = p_id OR draft ->> 'categoryId' = p_id::text
  ) THEN
    RAISE EXCEPTION 'category_in_use';
  END IF;
  DELETE FROM public.article_categories WHERE id = p_id;
END;
$$;

-- ------------------------------------------------------------ admin: e-books

CREATE OR REPLACE FUNCTION private.ebook_published_as_draft(p_ebook public.ebooks)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT jsonb_build_object(
    'slug', p_ebook.slug,
    'title', p_ebook.title,
    'coverPath', p_ebook.cover_path,
    'coverAlt', p_ebook.cover_alt,
    'shortDescription', p_ebook.short_description,
    'description', p_ebook.description,
    'audience', p_ebook.audience,
    'contents', p_ebook.contents,
    'format', p_ebook.format,
    'naffyUrl', p_ebook.naffy_url,
    'videoUrl', p_ebook.video_url,
    'samplePath', p_ebook.sample_path,
    'seoTitle', p_ebook.seo_title,
    'seoDescription', p_ebook.seo_description,
    'ogImagePath', p_ebook.og_image_path
  );
$$;

CREATE OR REPLACE FUNCTION public.create_ebook(p_draft jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM private.require_admin();
  INSERT INTO public.ebooks (draft) VALUES (p_draft) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_ebook_draft(p_id uuid, p_draft jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.ebooks SET draft = p_draft WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E-book not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_ebooks_admin()
RETURNS TABLE (
  id uuid,
  status text,
  draft jsonb,
  slug text,
  published_at timestamptz,
  updated_at timestamptz,
  has_unpublished_changes boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT ebook.id, ebook.status, ebook.draft, ebook.slug, ebook.published_at,
    ebook.updated_at,
    ebook.status <> 'published'
      OR ebook.draft IS DISTINCT FROM private.ebook_published_as_draft(ebook)
  FROM public.ebooks AS ebook
  ORDER BY ebook.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_ebook_admin(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  result jsonb;
BEGIN
  PERFORM private.require_admin();
  SELECT jsonb_build_object(
    'id', ebook.id,
    'status', ebook.status,
    'draft', ebook.draft,
    'slug', ebook.slug,
    'publishedAt', ebook.published_at,
    'contentUpdatedAt', ebook.content_updated_at,
    'updatedAt', ebook.updated_at
  )
  INTO result
  FROM public.ebooks AS ebook WHERE ebook.id = p_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_ebook(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  ebook public.ebooks;
  d jsonb;
  new_slug text;
BEGIN
  PERFORM private.require_admin();
  SELECT * INTO ebook FROM public.ebooks WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'E-book not found' USING ERRCODE = 'P0002';
  END IF;
  d := ebook.draft;
  new_slug := d ->> 'slug';

  IF btrim(d ->> 'title') = '' THEN RAISE EXCEPTION 'ebook_incomplete:title'; END IF;
  IF jsonb_typeof(d -> 'coverPath') <> 'string' OR btrim(d ->> 'coverAlt') = '' THEN
    RAISE EXCEPTION 'ebook_incomplete:cover';
  END IF;
  IF btrim(d ->> 'shortDescription') = '' THEN
    RAISE EXCEPTION 'ebook_incomplete:shortDescription';
  END IF;
  IF d ->> 'naffyUrl' = '' THEN RAISE EXCEPTION 'ebook_incomplete:naffyUrl'; END IF;
  IF EXISTS (SELECT 1 FROM public.ebooks WHERE slug = new_slug AND id <> p_id) THEN
    RAISE EXCEPTION 'ebook_slug_taken';
  END IF;

  DELETE FROM public.ebook_slug_redirects WHERE old_slug = new_slug;
  IF ebook.slug IS NOT NULL AND ebook.slug <> new_slug THEN
    INSERT INTO public.ebook_slug_redirects (old_slug, ebook_id)
    VALUES (ebook.slug, p_id)
    ON CONFLICT (old_slug) DO UPDATE
    SET ebook_id = EXCLUDED.ebook_id, created_at = now();
  END IF;

  UPDATE public.ebooks SET
    status = 'published',
    slug = new_slug,
    title = d ->> 'title',
    cover_path = d ->> 'coverPath',
    cover_alt = d ->> 'coverAlt',
    short_description = d ->> 'shortDescription',
    description = d -> 'description',
    audience = d ->> 'audience',
    contents = d -> 'contents',
    format = d ->> 'format',
    naffy_url = d ->> 'naffyUrl',
    video_url = d ->> 'videoUrl',
    sample_path = d ->> 'samplePath',
    seo_title = d ->> 'seoTitle',
    seo_description = d ->> 'seoDescription',
    og_image_path = d ->> 'ogImagePath',
    published_at = coalesce(published_at, now()),
    content_updated_at = now()
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_ebook(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.ebooks SET status = 'draft' WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_ebook(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF EXISTS (SELECT 1 FROM public.ebooks WHERE id = p_id AND status = 'published') THEN
    RAISE EXCEPTION 'ebook_published';
  END IF;
  DELETE FROM public.ebooks WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION
  public.create_article(jsonb), public.save_article_draft(uuid, jsonb),
  public.list_articles_admin(), public.get_article_admin(uuid),
  public.publish_article(uuid), public.unpublish_article(uuid),
  public.delete_article(uuid), public.delete_article_category(uuid),
  public.create_ebook(jsonb), public.save_ebook_draft(uuid, jsonb),
  public.list_ebooks_admin(), public.get_ebook_admin(uuid),
  public.publish_ebook(uuid), public.unpublish_ebook(uuid),
  public.delete_ebook(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.create_article(jsonb), public.save_article_draft(uuid, jsonb),
  public.list_articles_admin(), public.get_article_admin(uuid),
  public.publish_article(uuid), public.unpublish_article(uuid),
  public.delete_article(uuid), public.delete_article_category(uuid),
  public.create_ebook(jsonb), public.save_ebook_draft(uuid, jsonb),
  public.list_ebooks_admin(), public.get_ebook_admin(uuid),
  public.publish_ebook(uuid), public.unpublish_ebook(uuid),
  public.delete_ebook(uuid)
  TO authenticated, service_role;

-- ------------------------------------------------------------ the samples' files

-- The e-books' free samples: public PDFs, up to 20 MB, added by admins.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-downloads', 'site-downloads', true, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read site downloads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'site-downloads' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins upload site downloads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-downloads' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins update site downloads" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'site-downloads' AND public.has_role('admin'::public.app_role))
WITH CHECK (bucket_id = 'site-downloads' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins delete site downloads" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-downloads' AND public.has_role('admin'::public.app_role));
