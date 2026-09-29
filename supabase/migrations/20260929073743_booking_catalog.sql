-- The booking wizard's catalogue (docs/product/booking-plan.md, R4): what a
-- client can book, by exactly the rules the free times and the hold use,
-- and the centre's booking window. Public: nothing here is private.

-- Offers a client can book in some form: the service with this
-- specialist, everything on and published, bookings open.
CREATE FUNCTION private.bookable_offers()
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
    AND offer.active AND offer.accepting_new_clients
    AND (offer.supports_in_person OR offer.supports_online)
    AND specialist.active AND account.active
    AND profile.publication_status = 'published';
$$;
REVOKE ALL ON FUNCTION private.bookable_offers() FROM PUBLIC, anon, authenticated;

-- One offer, in one form (the hold and the free times use it).
CREATE OR REPLACE FUNCTION private.bookable_offer(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode
)
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT offer.id
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  WHERE offer.id IN (SELECT private.bookable_offers())
    AND service.slug = p_service_slug
    AND specialist.public_slug = p_specialist_slug
    AND CASE p_mode
      WHEN 'online' THEN offer.supports_online
      ELSE offer.supports_in_person
    END;
$$;

-- Everything the wizard's first steps need, in one read.
CREATE FUNCTION public.list_bookable_offers()
RETURNS TABLE (
  service_id uuid,
  service_slug text,
  service_name text,
  service_short_description text,
  service_description text,
  service_category public.service_category,
  service_default_duration_minutes integer,
  specialist_slug text,
  specialist_name text,
  specialist_title text,
  specialist_photo_path text,
  duration_minutes integer,
  price_minor integer,
  currency_code text,
  supports_in_person boolean,
  supports_online boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT service.id, service.slug, service.name, service.short_description,
    service.description, service.category, service.default_duration_minutes,
    specialist.public_slug, profile.display_name, specialist.professional_title,
    profile.profile_photo_url,
    coalesce(offer.duration_minutes, service.default_duration_minutes),
    offer.price_minor, offer.currency_code,
    offer.supports_in_person, offer.supports_online
  FROM public.specialist_services AS offer
  JOIN public.services AS service ON service.id = offer.service_id
  JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
  JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  WHERE offer.id IN (SELECT private.bookable_offers())
  ORDER BY service.sort_order, service.name, profile.display_name;
$$;

-- The centre's time zone and how far ahead clients can book.
CREATE FUNCTION public.booking_window()
RETURNS TABLE (time_zone text, horizon_days integer, hold_minutes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT timezone, max_booking_horizon_days, hold_minutes
  FROM public.center_settings
  WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.list_bookable_offers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_bookable_offers() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.booking_window() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_window() TO anon, authenticated, service_role;
