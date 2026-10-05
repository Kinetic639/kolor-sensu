-- What the site shows follows "Widoczny na stronie" (publicly_visible),
-- not "Aktywny" (20261006000000_specialist_two_settings). Three reads
-- still asked for an active specialist: a signed-in visitor reading the
-- specialists, the offers on a profile, and the redirect from a renamed
-- profile's old address (found by the database tests, specialist_domain).
-- An inactive specialist on the site shows there, offers and all, and
-- cannot be booked (private.bookable_offers still asks for both).

ALTER POLICY "Authenticated users can read permitted specialists"
ON public.specialists
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role('admin'::public.app_role)
  OR (publicly_visible AND private.specialist_has_published_profile(id))
);

ALTER POLICY "Public can read effective public specialist services"
ON public.specialist_services
USING (
  active
  AND private.service_is_public(service_id)
  AND private.specialist_is_listed(specialist_id)
);

ALTER POLICY "Redirects to published specialists are readable"
ON public.specialist_slug_redirects
USING (
  EXISTS (
    SELECT 1 FROM public.specialists AS specialist
    WHERE specialist.id = specialist_slug_redirects.specialist_id
      AND specialist.publicly_visible
      AND private.specialist_has_published_profile(specialist.id)
  )
);
