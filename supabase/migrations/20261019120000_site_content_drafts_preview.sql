-- The CMS preview (issue #109, docs/architecture/cms-domain.md "Preview on
-- the site"): in Draft Mode the public site shows the drafts. It reads them
-- on its server with the service-role key, through these two functions,
-- which only service_role may execute: never a visitor (anon) nor any
-- signed-in account (authenticated), whatever its role.
--
-- SECURITY INVOKER: service_role already reads site_content in full; the
-- functions only give that read a narrow, named shape. Were one ever granted
-- to anon by mistake, the table's own grants would still refuse the draft.

-- One section's draft, or null for a key that does not exist.
CREATE FUNCTION public.get_site_content_draft(p_key text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT draft_payload FROM public.site_content WHERE key = p_key;
$$;

-- When any section last changed (a saved draft or a publication): the
-- preview polls it and refreshes when it moves.
CREATE FUNCTION public.get_site_content_draft_version()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT max(updated_at) FROM public.site_content;
$$;

REVOKE ALL ON FUNCTION public.get_site_content_draft(text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_site_content_draft_version()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_content_draft(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_site_content_draft_version() TO service_role;
