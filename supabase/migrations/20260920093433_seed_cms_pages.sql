WITH inserted_home AS (
  INSERT INTO public.cms_pages (title, slug, seo_title, seo_description)
  VALUES (
    'Strona główna',
    'home',
    'Kolor Sensu | Centrum Psychoterapii',
    'Kolor Sensu, Centrum Psychoterapii.'
  )
  RETURNING id
),
home_section AS (
  INSERT INTO public.cms_page_sections (page_id, section_type, sort_order, heading, body)
  SELECT id, 'hero', 0, 'Kolor Sensu', 'Centrum Psychoterapii. Treść strony głównej w przygotowaniu.'
  FROM inserted_home
  RETURNING page_id
)
INSERT INTO public.cms_pages (title, slug)
SELECT 'O nas', 'o-nas'
UNION ALL
SELECT 'Kontakt', 'kontakt'
UNION ALL
SELECT 'Oferta', 'oferta';

INSERT INTO public.cms_page_sections (page_id, section_type, sort_order, heading, body)
SELECT id, 'rich_text', 0, 'O nas', 'Treść w przygotowaniu.'
FROM public.cms_pages WHERE slug = 'o-nas';

INSERT INTO public.cms_page_sections (page_id, section_type, sort_order, heading, body)
SELECT id, 'contact', 0, 'Kontakt', 'Dane kontaktowe w przygotowaniu.'
FROM public.cms_pages WHERE slug = 'kontakt';

INSERT INTO public.cms_page_sections (page_id, section_type, sort_order, heading, body)
SELECT id, 'rich_text', 0, 'Oferta', 'Opis oferty w przygotowaniu.'
FROM public.cms_pages WHERE slug = 'oferta';

-- Publish Home directly (migrations run outside any authenticated session, so
-- the admin-gated publish_cms_page() RPC cannot be called here) using the exact
-- same snapshot shape the RPC builds, to prove the full pipeline end-to-end.
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
WHERE slug = 'home';
