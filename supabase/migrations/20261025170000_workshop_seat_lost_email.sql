-- A payment that came after its seat was lost (the hold ran out and the
-- workshop filled meanwhile) is refunded at once, and now the guest hears
-- why (#196): a "seat_lost" e-mail, claimed once and listed as due so the
-- scheduled job sends it if the first try failed. Its amount is the
-- payment's (a lost seat never counted as paid). Both functions are their
-- whole current bodies (20261025150000, 20261023170000) with seat_lost.

ALTER TABLE public.workshop_emails DROP CONSTRAINT workshop_emails_kind_check;
ALTER TABLE public.workshop_emails ADD CONSTRAINT workshop_emails_kind_check CHECK (
  kind IN (
    'confirmation', 'reserved', 'waitlisted', 'offered', 'payment_reminder',
    'reminder', 'cancelled', 'rescheduled', 'refunded', 'seat_lost'
  )
);

-- (The body of 20261025150000_workshop_directions, with seat_lost.)
CREATE OR REPLACE FUNCTION public.claim_workshop_email(p_reference text, p_kind text)
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
    'reminder', 'cancelled', 'rescheduled', 'refunded', 'seat_lost'
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
    -- A payment that came too late for its seat, given back (#196).
    WHEN 'seat_lost' THEN v_registration.status <> 'confirmed' AND EXISTS (
      SELECT 1 FROM public.workshop_payments AS p
      WHERE p.registration_id = v_registration.id AND p.refunded_minor > 0
    )
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
    -- A lost seat's money is its payment's, never the registration's.
    greatest(v_registration.refunded_minor, (
      SELECT coalesce(sum(p.refunded_minor), 0)::integer
      FROM public.workshop_payments AS p WHERE p.registration_id = v_registration.id
    )),
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

-- (The body of 20261023170000_workshop_after_signup, with seat_lost.)
CREATE OR REPLACE FUNCTION public.list_due_workshop_emails()
RETURNS TABLE (reference text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH due AS (
    SELECT r.id, r.reference, 'offered'::text AS kind
    FROM public.workshop_registrations AS r
    WHERE r.status = 'offered' AND r.offer_expires_at > now()
    UNION ALL
    SELECT r.id, r.reference, 'payment_reminder'
    FROM public.workshop_registrations AS r
    WHERE r.status = 'awaiting_payment' AND r.payment_due_at > now()
      AND r.payment_due_at - interval '3 days' <= now()
      -- Not when reserved within those three days (its e-mail just went).
      AND r.created_at < r.payment_due_at - interval '3 days'
    UNION ALL
    SELECT r.id, r.reference, 'reminder'
    FROM public.workshop_registrations AS r
    JOIN public.workshops AS w ON w.id = r.workshop_id
    WHERE r.status = 'confirmed' AND w.status = 'published'
      AND w.starts_at > now() AND w.starts_at - interval '24 hours' <= now()
    UNION ALL
    SELECT r.id, r.reference, 'cancelled'
    FROM public.workshop_registrations AS r
    WHERE r.status = 'cancelled' AND r.cancelled_at > now() - interval '3 days'
      -- Booked, paid or waiting at some point (not a hold given up).
      AND (r.confirmed_at IS NOT NULL OR r.payment_due_at IS NOT NULL OR r.waitlisted_at IS NOT NULL)
    UNION ALL
    SELECT r.id, r.reference, 'rescheduled'
    FROM public.workshop_registrations AS r
    WHERE r.rescheduled_at IS NOT NULL AND r.rescheduled_at > now() - interval '3 days'
      AND r.status IN ('confirmed', 'awaiting_payment', 'waitlisted', 'offered')
    UNION ALL
    -- A payment too late for its seat, refunded in the last three days.
    SELECT r.id, r.reference, 'seat_lost'
    FROM public.workshop_registrations AS r
    WHERE r.status <> 'confirmed' AND EXISTS (
      SELECT 1 FROM public.workshop_payments AS p
      WHERE p.registration_id = r.id AND p.refunded_minor > 0
        AND p.updated_at > now() - interval '3 days'
    )
  )
  SELECT due.reference, due.kind FROM due
  JOIN public.workshop_registrations AS r ON r.id = due.id
  WHERE r.client_email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.workshop_emails AS e
      WHERE e.registration_id = due.id AND e.kind = due.kind
    );
$$;
