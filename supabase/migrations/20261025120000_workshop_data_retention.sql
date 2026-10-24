-- Workshop participants' data kept for 12 months after the workshop, the
-- owner's decision of 24.10 (#183), then anonymised as a client's is:
-- "Uczestnik usunięty", an @anonim.invalid placeholder, no phone and no
-- notes, and the name taken out of the portals' notifications. What the
-- books need stays: the reference, the amounts paid and refunded, the
-- status and its dates. The nightly apply_retention does it; an admin can
-- also do it at once, on the participant's request, for a seat that is
-- over (no workshop to come, no refund owed).

ALTER TABLE public.workshop_registrations
  ADD COLUMN forgotten_at timestamptz;

COMMENT ON COLUMN public.workshop_registrations.forgotten_at IS
  'When the participant''s name, e-mail, phone and notes were anonymised; null: kept.';

-- One seat's personal data, gone.
CREATE FUNCTION private.forget_workshop_registration(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_placeholder text := 'usuniety-' || left(replace(p_registration_id::text, '-', ''), 12) || '@anonim.invalid';
  v_reference text;
BEGIN
  UPDATE public.workshop_registrations SET
    client_name = 'Uczestnik usunięty',
    client_email = v_placeholder,
    client_phone = NULL,
    client_notes = NULL,
    forgotten_at = now()
  WHERE id = p_registration_id
  RETURNING reference INTO v_reference;

  UPDATE public.notifications AS notification
  SET details = notification.details || jsonb_build_object('client_name', 'Uczestnik usunięty')
  WHERE notification.appointment_id IS NULL
    AND notification.details ? 'client_name'
    AND notification.details ->> 'reference' = v_reference;
END;
$$;

-- A seat that is over: its workshop has ended, or the seat is no longer
-- live; and no refund is owed.
CREATE FUNCTION private.workshop_seat_is_over(p_registration_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT (w.ends_at <= now()
      OR r.status IN ('cancelled', 'expired'))
    AND r.refund_due_minor <= r.refunded_minor
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  WHERE r.id = p_registration_id;
$$;

-- Seats of workshops ended over 12 months ago, not yet anonymised.
CREATE FUNCTION private.workshop_registrations_past_keeping()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT r.id
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  WHERE r.forgotten_at IS NULL
    AND w.ends_at < now() - interval '12 months'
    AND r.refund_due_minor <= r.refunded_minor;
$$;

-- (The body of 20261006120000_baseline, with the workshop seats.)
CREATE OR REPLACE FUNCTION private.apply_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  client_id uuid;
  registration_id uuid;
BEGIN
  DELETE FROM public.visit_intakes
  WHERE id IN (SELECT private.intakes_past_keeping());
  FOR client_id IN SELECT private.clients_past_keeping() LOOP
    PERFORM private.forget_client_data(client_id);
  END LOOP;
  FOR registration_id IN SELECT private.workshop_registrations_past_keeping() LOOP
    PERFORM private.forget_workshop_registration(registration_id);
  END LOOP;
END;
$$;

-- "Usuń dane" in the admin portal, on the participant's request.
CREATE FUNCTION public.forget_workshop_participant(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.workshop_registrations WHERE id = p_registration_id) THEN
    RAISE EXCEPTION 'No such participant' USING HINT = 'not_found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations
    WHERE id = p_registration_id AND forgotten_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Already removed' USING HINT = 'already_forgotten';
  END IF;
  IF NOT private.workshop_seat_is_over(p_registration_id) THEN
    RAISE EXCEPTION 'A workshop to come or a refund owed' USING HINT = 'participant_busy';
  END IF;
  PERFORM private.forget_workshop_registration(p_registration_id);
END;
$$;

REVOKE ALL ON FUNCTION private.forget_workshop_registration(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.workshop_seat_is_over(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.workshop_registrations_past_keeping() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.forget_workshop_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forget_workshop_participant(uuid) TO authenticated;

GRANT SELECT (forgotten_at) ON public.workshop_registrations TO authenticated;
