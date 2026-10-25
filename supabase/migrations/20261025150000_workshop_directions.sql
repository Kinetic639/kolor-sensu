-- How to get to a workshop held in place (#211): a short text by the
-- location in the admin portal ("Jak dojechać": the entrance, the floor,
-- parking), shown under the address on the workshop's page, on the
-- registration's page and in its e-mails, beside a link to the maps. The
-- three readers below are their whole current bodies (20261023090000 and
-- 20261023170000) with location_directions last; their grants as before.

ALTER TABLE public.locations
  ADD COLUMN directions text
  CONSTRAINT locations_directions_length CHECK (directions IS NULL OR char_length(directions) <= 500);

COMMENT ON COLUMN public.locations.directions IS
  'How to get there (the entrance, the floor, parking), for a workshop held there.';

-- (The body of 20261023090000_workshop_signup, with location_directions.)
DROP FUNCTION public.list_public_workshops();
CREATE FUNCTION public.list_public_workshops()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  short_description text,
  body jsonb,
  audience text,
  agenda text,
  cover_image_path text,
  cover_alt text,
  seo_title text,
  seo_description text,
  modality public.workshop_modality,
  status public.workshop_status,
  starts_at timestamptz,
  ends_at timestamptz,
  price_minor integer,
  currency_code text,
  capacity integer,
  min_participants integer,
  location_name text,
  location_address text,
  location_city text,
  room_name text,
  leaders jsonb,
  seats_left integer,
  registration_open boolean,
  confirmed boolean,
  updated_at timestamptz,
  location_directions text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT w.id, w.slug, w.title, w.short_description, w.body, w.audience, w.agenda,
    w.cover_image_path, w.cover_alt, w.seo_title, w.seo_description,
    w.modality, w.status, w.starts_at, w.ends_at, w.price_minor, w.currency_code,
    w.capacity, w.min_participants,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    location.city,
    room.name,
    coalesce((
      SELECT jsonb_agg(jsonb_build_object(
          'slug', specialist.public_slug,
          'name', profile.display_name,
          'title', specialist.professional_title,
          'photoPath', profile.profile_photo_url
        ) ORDER BY leader.main DESC, profile.display_name)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader
      JOIN public.specialists AS specialist ON specialist.id = leader.id
      JOIN public.specialist_public_profiles AS profile ON profile.specialist_id = specialist.id
      WHERE specialist.publicly_visible AND private.specialist_has_published_profile(specialist.id)
    ), '[]'::jsonb),
    greatest(w.capacity - private.workshop_seats_taken(w.id), 0),
    w.status = 'published' AND w.registration_enabled
      AND now() < private.workshop_closes_at(w.registration_closes_at, w.starts_at),
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.updated_at,
    location.directions
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.status <> 'draft'
  ORDER BY w.starts_at;
$$;

-- (The body of 20261023170000_workshop_after_signup, with location_directions.)
DROP FUNCTION public.get_workshop_registration(text);
CREATE FUNCTION public.get_workshop_registration(p_access_token text)
RETURNS TABLE (
  reference text,
  status public.workshop_registration_status,
  workshop_slug text,
  workshop_title text,
  workshop_status public.workshop_status,
  workshop_confirmed boolean,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  room_name text,
  price_minor integer,
  currency_code text,
  paid_minor integer,
  refund_due_minor integer,
  refunded_minor integer,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  details_saved boolean,
  hold_expires_at timestamptz,
  payment_due_at timestamptz,
  offer_expires_at timestamptz,
  waitlist_position integer,
  full_refund_until timestamptz,
  can_pay_later boolean,
  cancelled_by text,
  meeting_url text,
  list_price_minor integer,
  discount_minor integer,
  discount_code text,
  refund_any_time boolean,
  refund_when_replaced boolean,
  workshop_cancel_reason text,
  paid_outside boolean,
  location_directions text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.reference,
    CASE
      WHEN r.status = 'held' AND r.hold_expires_at <= now() THEN 'expired'
      WHEN r.status = 'offered' AND r.offer_expires_at <= now() THEN 'expired'
      WHEN r.status = 'awaiting_payment' AND r.payment_due_at <= now() THEN 'cancelled'
      ELSE r.status
    END::public.workshop_registration_status,
    w.slug, w.title, w.status,
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.modality, w.starts_at, w.ends_at,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    room.name,
    r.price_minor, r.currency_code, r.paid_minor, r.refund_due_minor, r.refunded_minor,
    r.client_name, r.client_email, r.client_phone, r.client_notes,
    r.client_email IS NOT NULL AND (r.terms_accepted_at IS NOT NULL OR r.booked_by = 'centre'),
    r.hold_expires_at, r.payment_due_at, r.offer_expires_at,
    CASE WHEN r.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = r.workshop_id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (r.waitlisted_at, r.created_at)
    ) END,
    w.starts_at - private.workshop_notice(),
    r.price_minor > 0 AND w.starts_at - private.workshop_notice() > now(),
    r.cancelled_by,
    CASE WHEN r.status = 'confirmed' AND w.status = 'published' THEN link.meeting_url END,
    r.list_price_minor, r.discount_minor, dc.code,
    r.refund_any_time, r.refund_when_replaced, w.cancel_reason, r.paid_outside,
    location.directions
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_online_links AS link ON link.workshop_id = w.id
  LEFT JOIN public.discount_codes AS dc ON dc.id = r.discount_code_id
  WHERE r.id = private.workshop_registration_id(p_access_token);
$$;

-- (The body of 20261023170000_workshop_after_signup, with location_directions.)
DROP FUNCTION public.claim_workshop_email(text, text);
CREATE FUNCTION public.claim_workshop_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text,
  manage_token text,
  status public.workshop_registration_status,
  client_name text,
  client_email text,
  workshop_title text,
  workshop_slug text,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  location_name text,
  location_address text,
  room_name text,
  leaders text,
  price_minor integer,
  paid_minor integer,
  currency_code text,
  payment_due_at timestamptz,
  waitlist_position integer,
  offer_expires_at timestamptz,
  cancelled_by text,
  cancel_reason text,
  refund_due_minor integer,
  refunded_minor integer,
  refund_when_replaced boolean,
  meeting_url text,
  paid_outside boolean,
  location_directions text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_token text;
  v_due boolean;
BEGIN
  IF p_kind NOT IN (
    'confirmation', 'reserved', 'waitlisted', 'offered', 'payment_reminder',
    'reminder', 'cancelled', 'rescheduled', 'refunded'
  ) THEN
    RAISE EXCEPTION 'Unknown e-mail %', p_kind USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_registration FROM public.workshop_registrations AS r
  WHERE r.reference = p_reference FOR UPDATE;
  IF NOT FOUND OR v_registration.client_email IS NULL THEN
    RETURN;
  END IF;
  -- Whether the registration is in the state the e-mail is about.
  v_due := CASE p_kind
    WHEN 'confirmation' THEN v_registration.status = 'confirmed'
    WHEN 'reserved' THEN v_registration.status = 'awaiting_payment'
    WHEN 'waitlisted' THEN v_registration.status = 'waitlisted'
    WHEN 'offered' THEN v_registration.status = 'offered' AND v_registration.offer_expires_at > now()
    WHEN 'payment_reminder' THEN v_registration.status = 'awaiting_payment' AND v_registration.payment_due_at > now()
    WHEN 'reminder' THEN v_registration.status = 'confirmed'
    WHEN 'cancelled' THEN v_registration.status = 'cancelled'
    WHEN 'rescheduled' THEN v_registration.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
    ELSE v_registration.status = 'cancelled' AND v_registration.refunded_minor > 0
  END;
  IF NOT v_due THEN
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_emails AS e
    WHERE e.registration_id = v_registration.id AND e.kind = p_kind
      AND (e.sent_at IS NOT NULL OR e.claimed_at > now() - interval '10 minutes')
  ) THEN
    RETURN;
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  INSERT INTO public.workshop_emails (registration_id, kind, token_hash)
  VALUES (v_registration.id, p_kind, extensions.digest(v_token, 'sha256'))
  ON CONFLICT (registration_id, kind) DO UPDATE
    SET token_hash = EXCLUDED.token_hash, claimed_at = now();

  RETURN QUERY
  SELECT v_registration.reference, v_token, v_registration.status,
    v_registration.client_name, v_registration.client_email,
    w.title, w.slug, w.modality, w.starts_at, w.ends_at,
    location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    room.name,
    (SELECT string_agg(private.specialist_display_name(leader.id), ', ' ORDER BY leader.main DESC, leader.id)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader),
    v_registration.price_minor, v_registration.paid_minor, v_registration.currency_code,
    v_registration.payment_due_at,
    CASE WHEN v_registration.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = w.id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (v_registration.waitlisted_at, v_registration.created_at)
    ) END,
    v_registration.offer_expires_at,
    v_registration.cancelled_by,
    w.cancel_reason,
    v_registration.refund_due_minor,
    v_registration.refunded_minor,
    v_registration.refund_when_replaced,
    CASE WHEN v_registration.status = 'confirmed' AND w.status = 'published'
      THEN (SELECT link.meeting_url FROM public.workshop_online_links AS link WHERE link.workshop_id = w.id) END,
    v_registration.paid_outside,
    location.directions
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  WHERE w.id = v_registration.workshop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.list_public_workshops() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_workshops() TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_workshop_registration(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_workshop_registration(text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_workshop_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_workshop_email(text, text) TO service_role;
