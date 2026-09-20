ALTER TABLE public.cms_pages DROP CONSTRAINT cms_pages_publication_time;

ALTER TABLE public.cms_pages ADD CONSTRAINT cms_pages_publication_time CHECK (
  status <> 'published' OR published_at IS NOT NULL
);
