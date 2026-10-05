-- Specjaliści: the admin hides a specialist from the site or suspends them.
--
-- Hidden: no profile on the site and no online booking; the centre still
-- books their visits and their portal works (a break, a profile not ready).
-- Suspended: neither, and no portal (their specialist role goes; an admin
-- who is also a specialist keeps the admin's); booked visits stay, for the
-- centre to move or cancel. Resuming gives the role back.

ALTER TABLE public.specialists
  ADD COLUMN publicly_visible boolean NOT NULL DEFAULT true;

CREATE FUNCTION private.specialist_is_listed(p_specialist uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = p_specialist AND active AND publicly_visible
  );
$$;

REVOKE ALL ON FUNCTION private.specialist_is_listed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.specialist_is_listed(uuid) TO anon, authenticated;

ALTER POLICY "Public can read active specialists with published profiles"
ON public.specialists
USING (active AND publicly_visible AND private.specialist_has_published_profile(id));

ALTER POLICY "Public can read published profiles of active specialists"
ON public.specialist_public_profiles
USING (
  publication_status = 'published'::profile_publication_status
  AND private.specialist_is_listed(specialist_id)
);

-- Online booking: a hidden specialist is not offered.
CREATE OR REPLACE FUNCTION private.bookable_offers()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
    AND specialist.active AND specialist.publicly_visible AND account.active
    AND profile.publication_status = 'published';
$function$;

CREATE FUNCTION public.set_specialist_visibility(p_specialist uuid, p_visible boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  UPDATE public.specialists SET publicly_visible = p_visible WHERE id = p_specialist;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such specialist.' USING HINT = 'not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_specialist_visibility(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_specialist_visibility(uuid, boolean) TO authenticated;

CREATE FUNCTION public.set_specialist_active(p_specialist uuid, p_active boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_upcoming integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  UPDATE public.specialists SET active = p_active WHERE id = p_specialist
  RETURNING user_id INTO v_user;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No such specialist.' USING HINT = 'not_found';
  END IF;
  IF p_active THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user, 'specialist') ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = v_user AND role = 'specialist';
  END IF;
  -- The visits still booked with them (for the centre to move or cancel).
  SELECT count(*)::integer INTO v_upcoming
  FROM public.appointments
  WHERE specialist_id = p_specialist
    AND status IN ('confirmed', 'awaiting_payment')
    AND lower(during) > now();
  RETURN v_upcoming;
END;
$$;

REVOKE ALL ON FUNCTION public.set_specialist_active(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_specialist_active(uuid, boolean) TO authenticated;
