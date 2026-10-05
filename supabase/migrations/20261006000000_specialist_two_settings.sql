-- A specialist's two settings, both off for a new one (the admin turns
-- them on once their profile is ready):
--
-- active (Aktywny): takes new visits, online and from the centre;
-- publicly_visible (Widoczny na stronie): their profile (once approved)
--   is on the site.
--
-- Online booking needs both; the centre books an active one; the site
-- shows a visible one. Their portal works either way (their profile, the
-- visits already booked): turning "active" off no longer takes the
-- specialist role. Whoever lost it to a suspension gets it back.

ALTER TABLE public.specialists
  ALTER COLUMN active SET DEFAULT false,
  ALTER COLUMN publicly_visible SET DEFAULT false;

INSERT INTO public.user_roles (user_id, role)
SELECT specialist.user_id, 'specialist'
FROM public.specialists AS specialist
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles AS role
  WHERE role.user_id = specialist.user_id AND role.role = 'specialist'
)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_specialist_active(p_specialist uuid, p_active boolean)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_upcoming integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  UPDATE public.specialists SET active = p_active WHERE id = p_specialist;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such specialist.' USING HINT = 'not_found';
  END IF;
  -- The visits still booked with them (they stay).
  SELECT count(*)::integer INTO v_upcoming
  FROM public.appointments
  WHERE specialist_id = p_specialist
    AND status IN ('confirmed', 'awaiting_payment')
    AND lower(during) > now();
  RETURN v_upcoming;
END;
$$;

-- On the site: visible and their profile approved (active or not).
CREATE OR REPLACE FUNCTION private.specialist_is_listed(p_specialist uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = p_specialist AND publicly_visible
  );
$$;

ALTER POLICY "Public can read active specialists with published profiles"
ON public.specialists
USING (publicly_visible AND private.specialist_has_published_profile(id));

ALTER POLICY "Public can read published profiles of active specialists"
ON public.specialist_public_profiles
USING (
  publication_status = 'published'::profile_publication_status
  AND private.specialist_is_listed(specialist_id)
);

CREATE OR REPLACE FUNCTION private.can_read_published_specialist_media(object_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles AS profile
    JOIN public.specialists AS specialist ON specialist.id = profile.specialist_id
    WHERE specialist.publicly_visible
      AND profile.publication_status = 'published'
      AND object_name IN (profile.profile_photo_url, profile.portrait_photo_url)
  );
$function$;

-- An inactive specialist still closes the visits they held.
CREATE OR REPLACE FUNCTION private.notify_visits_to_close()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT specialist.user_id, 'specialist', visit.id, 'visit_to_close', 'system',
    jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during),
      'mode', visit.mode
    )
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN public.services AS service ON service.id = visit.service_id
  WHERE visit.status = 'confirmed'
    AND upper(visit.during) <= now()
    AND upper(visit.during) > now() - interval '1 day'
    AND NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications AS sent
      WHERE sent.appointment_id = visit.id AND sent.kind = 'visit_to_close'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.visits_to_close_by_specialist()
RETURNS TABLE (specialist_id uuid, specialist_name text, email text,
  visits jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT specialist.id,
    coalesce(nullif(profile.display_name, ''), 'Specjalista'),
    account.email::text,
    jsonb_agg(jsonb_build_object(
      'reference', visit.reference,
      'service_name', service.name,
      'starts_at', lower(visit.during)
    ) ORDER BY lower(visit.during))
  FROM public.appointments AS visit
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  JOIN auth.users AS account ON account.id = specialist.user_id
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
  WHERE NOT EXISTS (SELECT 1 FROM public.visit_closures WHERE appointment_id = visit.id)
    AND private.closure_state(visit.status, lower(visit.during), upper(visit.during), NULL) = 'open'
    AND upper(visit.during) <= now()
  GROUP BY specialist.id, profile.display_name, account.email;
$$;
