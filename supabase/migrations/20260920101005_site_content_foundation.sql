CREATE TABLE public.site_content (
  key text PRIMARY KEY CHECK (key = 'home'),
  draft_payload jsonb NOT NULL,
  published_payload jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_content_draft_payload_shape CHECK (
    jsonb_typeof(draft_payload) = 'object'
    AND draft_payload ? 'heading'
    AND draft_payload ? 'body'
  ),
  CONSTRAINT site_content_published_payload_shape CHECK (
    published_payload IS NULL OR (
      jsonb_typeof(published_payload) = 'object'
      AND published_payload ? 'heading'
      AND published_payload ? 'body'
    )
  ),
  CONSTRAINT site_content_publication_time CHECK (
    published_payload IS NULL OR published_at IS NOT NULL
  )
);

CREATE TRIGGER set_site_content_updated_at
BEFORE UPDATE ON public.site_content
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.site_content FROM PUBLIC, anon, authenticated;

GRANT SELECT (key, published_payload, published_at) ON public.site_content TO anon;
GRANT SELECT, UPDATE ON public.site_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO service_role;

CREATE POLICY "Public can read published site content"
ON public.site_content
FOR SELECT
TO anon
USING (published_payload IS NOT NULL);

CREATE POLICY "Admins can read site content"
ON public.site_content
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update site content"
ON public.site_content
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE FUNCTION public.publish_site_content(p_key text)
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

  UPDATE public.site_content
  SET published_payload = draft_payload, published_at = now()
  WHERE key = p_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site content not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_site_content(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_site_content(text) TO authenticated;

INSERT INTO public.site_content (key, draft_payload)
VALUES (
  'home',
  jsonb_build_object(
    'heading', 'Kolor Sensu',
    'body', 'Centrum Psychoterapii. Treść strony głównej w przygotowaniu.',
    'buttonLabel', NULL
  )
);

UPDATE public.site_content
SET published_payload = draft_payload, published_at = now()
WHERE key = 'home';
