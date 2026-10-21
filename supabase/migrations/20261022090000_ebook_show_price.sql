-- An e-book may show its price from Naffy (docs/product/education-plan.md,
-- #150): the admin chooses, per e-book, the price (and a promotion as
-- Naffy shows it) or only "Zobacz cenę i kup na Naffy". The draft gains
-- 'showPrice' (every draft so far: false) and the published version
-- 'show_price', read by visitors like the other published columns.

ALTER TABLE public.ebooks ADD COLUMN show_price boolean NOT NULL DEFAULT false;
GRANT SELECT (show_price) ON public.ebooks TO anon, authenticated;

-- The draft's check, its whole body: plus showPrice.
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
    AND jsonb_typeof(p_draft -> 'showPrice') = 'boolean'
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

UPDATE public.ebooks SET draft = draft || '{"showPrice": false}'::jsonb
WHERE NOT draft ? 'showPrice';

-- The published version as a draft (for "changes not published"), its
-- whole body: plus showPrice.
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
    'showPrice', p_ebook.show_price,
    'videoUrl', p_ebook.video_url,
    'samplePath', p_ebook.sample_path,
    'seoTitle', p_ebook.seo_title,
    'seoDescription', p_ebook.seo_description,
    'ogImagePath', p_ebook.og_image_path
  );
$$;

-- Publishing, its whole body: plus show_price.
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
    show_price = (d ->> 'showPrice')::boolean,
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
