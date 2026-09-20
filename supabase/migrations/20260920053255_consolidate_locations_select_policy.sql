DROP POLICY "Admins can read all locations" ON public.locations;
DROP POLICY "Specialists can read active locations" ON public.locations;

CREATE POLICY "Authenticated users can read permitted locations"
ON public.locations
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (public.has_role('specialist'::public.app_role) AND active)
);
