CREATE TYPE public.cms_page_status AS ENUM ('draft', 'published', 'archived');

CREATE TYPE public.cms_section_type AS ENUM (
  'hero',
  'rich_text',
  'image_text',
  'callout',
  'contact'
);

CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  status public.cms_page_status NOT NULL DEFAULT 'draft',
  seo_title text,
  seo_description text,
  og_title text,
  og_description text,
  published_snapshot jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_pages_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT cms_pages_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 1 AND 100
  ),
  CONSTRAINT cms_pages_seo_title_length CHECK (
    seo_title IS NULL OR char_length(seo_title) <= 200
  ),
  CONSTRAINT cms_pages_seo_description_length CHECK (
    seo_description IS NULL OR char_length(seo_description) <= 500
  ),
  CONSTRAINT cms_pages_og_title_length CHECK (
    og_title IS NULL OR char_length(og_title) <= 200
  ),
  CONSTRAINT cms_pages_og_description_length CHECK (
    og_description IS NULL OR char_length(og_description) <= 500
  ),
  CONSTRAINT cms_pages_publication_time CHECK (
    (status = 'published' AND published_at IS NOT NULL)
    OR (status <> 'published' AND published_at IS NULL)
    OR (status <> 'published' AND published_at IS NOT NULL)
  )
);

CREATE INDEX cms_pages_status_idx ON public.cms_pages (status);

CREATE TABLE public.cms_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.cms_pages (id) ON DELETE CASCADE,
  section_type public.cms_section_type NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  heading text,
  body text,
  image_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_page_sections_heading_length CHECK (
    heading IS NULL OR char_length(heading) <= 200
  ),
  CONSTRAINT cms_page_sections_body_length CHECK (
    body IS NULL OR char_length(body) <= 10000
  ),
  CONSTRAINT cms_page_sections_image_path_length CHECK (
    image_path IS NULL OR char_length(image_path) <= 2048
  ),
  CONSTRAINT cms_page_sections_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX cms_page_sections_page_id_sort_order_idx
ON public.cms_page_sections (page_id, sort_order);

CREATE TRIGGER set_cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_cms_page_sections_updated_at
BEFORE UPDATE ON public.cms_page_sections
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_page_sections FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.cms_pages FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.cms_page_sections FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TYPE public.cms_page_status FROM PUBLIC, anon;
REVOKE ALL ON TYPE public.cms_section_type FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.cms_page_status TO authenticated, service_role;
GRANT USAGE ON TYPE public.cms_section_type TO authenticated, service_role;

GRANT SELECT (slug, status, published_snapshot, published_at)
  ON public.cms_pages TO anon;
GRANT SELECT, INSERT, UPDATE ON public.cms_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_pages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_page_sections TO service_role;

CREATE POLICY "Public can read published cms pages"
ON public.cms_pages
FOR SELECT
TO anon
USING (status = 'published');

CREATE POLICY "Admins can read cms pages"
ON public.cms_pages
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can insert cms pages"
ON public.cms_pages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update cms pages"
ON public.cms_pages
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can read cms page sections"
ON public.cms_page_sections
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can insert cms page sections"
ON public.cms_page_sections
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update cms page sections"
ON public.cms_page_sections
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete cms page sections"
ON public.cms_page_sections
FOR DELETE
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE FUNCTION public.publish_cms_page(p_page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.cms_pages
  SET
    status = 'published',
    published_at = now(),
    published_snapshot = jsonb_build_object(
      'title', title,
      'seoTitle', seo_title,
      'seoDescription', seo_description,
      'ogTitle', og_title,
      'ogDescription', og_description,
      'sections', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'sectionType', s.section_type,
            'sortOrder', s.sort_order,
            'heading', s.heading,
            'body', s.body,
            'imagePath', s.image_path
          ) ORDER BY s.sort_order
        )
        FROM public.cms_page_sections s
        WHERE s.page_id = cms_pages.id
      ), '[]'::jsonb)
    )
  WHERE id = p_page_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_cms_page(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_cms_page(uuid) TO authenticated;
