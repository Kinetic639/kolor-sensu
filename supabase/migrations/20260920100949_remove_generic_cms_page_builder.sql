-- The generic page-builder CMS (arbitrary pages, arbitrary slugs,
-- section-type-driven blocks) was the wrong shape for this product: the
-- public site's routes/layout/structure are code-owned in Next.js. There is
-- no valuable production data in these tables yet, so they are dropped
-- outright rather than migrated. Replaced by the fixed, tightly-typed
-- `site_content` model in the next migration.
DROP TABLE public.cms_page_sections;
DROP TABLE public.cms_pages;
DROP FUNCTION public.publish_cms_page(uuid);
DROP TYPE public.cms_section_type;
DROP TYPE public.cms_page_status;
