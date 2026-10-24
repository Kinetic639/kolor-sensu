-- A workshop's old address leads to its new one (#184), as an article's
-- does: when the admin changes the address of a workshop that has been on
-- the site (not a draft), the old address is kept and the site redirects
-- it for good (308). A workshop that takes an address stops it
-- redirecting. Only the site reads it, through workshop_redirect.

CREATE TABLE public.workshop_slug_redirects (
  old_slug text PRIMARY KEY CHECK (private.is_slug(old_slug)),
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_slug_redirects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_slug_redirects FROM anon, authenticated;

-- On every address change of a workshop seen on the site, and on every
-- address taken.
CREATE FUNCTION private.workshop_slug_moved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.workshop_slug_redirects WHERE old_slug = NEW.slug;
  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug AND OLD.status <> 'draft' THEN
    INSERT INTO public.workshop_slug_redirects (old_slug, workshop_id)
    VALUES (OLD.slug, NEW.id)
    ON CONFLICT (old_slug) DO UPDATE
    SET workshop_id = EXCLUDED.workshop_id, created_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workshop_slug_moved
  AFTER INSERT OR UPDATE OF slug ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION private.workshop_slug_moved();

-- The current address of a workshop whose address changed (one the site
-- shows: not a draft), or null.
CREATE FUNCTION public.workshop_redirect(p_slug text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT w.slug
  FROM public.workshop_slug_redirects AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  WHERE r.old_slug = p_slug AND w.status <> 'draft';
$$;

REVOKE ALL ON FUNCTION private.workshop_slug_moved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.workshop_redirect(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workshop_redirect(text) TO anon, authenticated, service_role;
