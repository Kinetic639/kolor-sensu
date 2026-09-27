-- Admins give specialists readable public addresses (e.g. /specjalisci/
-- anna-kowalska) instead of the UUID-based placeholder. Admins still have no
-- direct UPDATE on specialists: the change goes through one audited function.
-- Previous slugs keep working: the site redirects them to the current one.

CREATE TABLE public.specialist_slug_redirects (
  old_slug text PRIMARY KEY,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_slug_redirects_old_slug_format CHECK (
    old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(old_slug) BETWEEN 3 AND 100
  )
);

CREATE INDEX specialist_slug_redirects_specialist_id_idx
ON public.specialist_slug_redirects (specialist_id);

ALTER TABLE public.specialist_slug_redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_slug_redirects FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.specialist_slug_redirects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.specialist_slug_redirects TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialist_slug_redirects TO service_role;

-- Only redirects to profiles the reader may see anyway.
CREATE POLICY "Redirects to published specialists are readable"
ON public.specialist_slug_redirects
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.specialists AS specialist
    WHERE specialist.id = specialist_slug_redirects.specialist_id
      AND specialist.active
      AND private.specialist_has_published_profile(specialist.id)
  )
);

CREATE FUNCTION public.set_specialist_public_slug(
  p_specialist_id uuid,
  p_public_slug text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_slug text := lower(trim(p_public_slug));
  current_slug text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  SELECT public_slug INTO current_slug
  FROM public.specialists
  WHERE id = p_specialist_id
  FOR UPDATE;

  IF current_slug IS NULL THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  IF new_slug = current_slug THEN
    RETURN current_slug;
  END IF;

  -- Taken by another specialist: the unique constraint would say the same,
  -- but this names the problem.
  IF EXISTS (
    SELECT 1 FROM public.specialists
    WHERE public_slug = new_slug AND id <> p_specialist_id
  ) THEN
    RAISE EXCEPTION 'Public slug already in use' USING ERRCODE = '23505';
  END IF;

  -- The new slug stops redirecting anywhere (it may be this specialist's old
  -- one, or a long-retired one of someone else).
  DELETE FROM public.specialist_slug_redirects WHERE old_slug = new_slug;

  UPDATE public.specialists
  SET public_slug = new_slug
  WHERE id = p_specialist_id;

  INSERT INTO public.specialist_slug_redirects (old_slug, specialist_id)
  VALUES (current_slug, p_specialist_id)
  ON CONFLICT (old_slug) DO UPDATE
  SET specialist_id = EXCLUDED.specialist_id,
      created_at = now();

  RETURN new_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.set_specialist_public_slug(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_specialist_public_slug(uuid, text) TO authenticated;
