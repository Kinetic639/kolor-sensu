-- Offers and specialists no longer say whether they take new clients: a
-- specialist who takes a service on has its offer active, and an active
-- offer is bookable by anyone. The bookable offers lose the condition, and
-- both columns go (the specialists' column grant goes with its column).

CREATE OR REPLACE FUNCTION private.bookable_offers()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT offer.id
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  JOIN public.profiles AS account ON account.id = specialist.user_id
  JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  JOIN public.center_settings AS centre ON centre.id = 1
  WHERE centre.booking_enabled
    AND service.active AND service.publicly_visible AND service.booking_enabled
    AND offer.active
    AND (offer.supports_in_person OR offer.supports_online)
    AND specialist.active AND account.active
    AND profile.publication_status = 'published';
$$;
REVOKE ALL ON FUNCTION private.bookable_offers() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.specialist_services DROP COLUMN accepting_new_clients;
ALTER TABLE public.specialists DROP COLUMN accepting_new_clients;
