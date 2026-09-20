DROP POLICY "Users can read their own profile" ON public.profiles;
DROP POLICY "Admins can read profiles" ON public.profiles;

CREATE POLICY "Users can read permitted profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = id
  OR public.has_role('admin'::public.app_role)
);
