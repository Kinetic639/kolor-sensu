-- Workshops, PR 1 (docs/product/workshops-plan.md): a one-off workshop
-- with its description, co-leaders, a minimum and a registration deadline;
-- registrations with a held seat, paying now or up to seven days before,
-- and a waitlist; and a published workshop blocking its leaders and room
-- for visits.
--
-- The blocking reuses what every booking path already checks: a published
-- workshop writes a time-off row for each leader and a blocked interval in
-- its room (both tagged with workshop_id, so only the workshop changes
-- them). Free times, the guest's hold and the centre's own booking then
-- skip those hours with no change to their functions.
--
-- A seat counts while it is confirmed, awaiting payment before its due
-- time, held before the hold ends or offered to the waitlist before the
-- offer ends. A seat set free (cancelled, expired, capacity raised) goes
-- to the first person on the waitlist, who has 24 hours to take it.
-- Refunds: full until seven days before; later only when someone from the
-- waitlist takes the seat; always full when the centre cancels. The money
-- itself moves in later PRs (Stripe); this records what is owed.
--
-- Guests act through functions for the site's server (service_role), like
-- the visit booking; admins and the workshop's leaders read registrations.

-- ------------------------------------------------------------ the workshop

ALTER TABLE public.workshops
  ADD COLUMN body jsonb CHECK (body IS NULL OR private.is_rich_text(body)),
  ADD COLUMN audience text CHECK (audience IS NULL OR char_length(audience) <= 2000),
  ADD COLUMN agenda text CHECK (agenda IS NULL OR char_length(agenda) <= 3000),
  ADD COLUMN cover_alt text CHECK (cover_alt IS NULL OR char_length(cover_alt) <= 300),
  ADD COLUMN seo_title text CHECK (seo_title IS NULL OR char_length(seo_title) <= 70),
  ADD COLUMN seo_description text CHECK (seo_description IS NULL OR char_length(seo_description) <= 160),
  ADD COLUMN min_participants integer,
  ADD COLUMN registration_closes_at timestamptz,
  ADD COLUMN confirmed_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancel_reason text CHECK (cancel_reason IS NULL OR char_length(cancel_reason) <= 1000),
  ADD CONSTRAINT workshops_min_participants_range CHECK (
    min_participants IS NULL OR min_participants BETWEEN 1 AND capacity
  ),
  ADD CONSTRAINT workshops_registration_closes_valid CHECK (
    registration_closes_at IS NULL OR registration_closes_at <= starts_at
  );

-- How long before the start a refund is full and paying later is allowed.
CREATE OR REPLACE FUNCTION private.workshop_notice()
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT interval '7 days';
$$;

-- When registration ends: the admin's time, or 24 hours before the start.
CREATE OR REPLACE FUNCTION private.workshop_closes_at(
  p_closes_at timestamptz, p_starts_at timestamptz
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT coalesce(p_closes_at, p_starts_at - interval '24 hours');
$$;

-- Co-leaders, besides the workshop's main leader (specialist_id).
CREATE TABLE public.workshop_co_leaders (
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  PRIMARY KEY (workshop_id, specialist_id)
);

CREATE INDEX workshop_co_leaders_specialist_idx
  ON public.workshop_co_leaders (specialist_id);

-- The online meeting's link: never on the public page, only for admins,
-- the leaders and (through get_workshop_registration) the participants.
CREATE TABLE public.workshop_online_links (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops (id) ON DELETE CASCADE,
  meeting_url text NOT NULL CHECK (
    meeting_url ~ '^https://[^\s]+$' AND char_length(meeting_url) <= 2048
  ),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_workshop_online_links_updated_at
  BEFORE UPDATE ON public.workshop_online_links
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- Whether the signed-in user leads the workshop (main or co-leader).
-- Definer, so the policies below can use it without reading each other.
CREATE OR REPLACE FUNCTION private.leads_workshop(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workshops AS workshop
    JOIN public.specialists AS specialist ON specialist.id = workshop.specialist_id
    WHERE workshop.id = p_workshop_id AND specialist.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.workshop_co_leaders AS co
    JOIN public.specialists AS specialist ON specialist.id = co.specialist_id
    WHERE co.workshop_id = p_workshop_id AND specialist.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.workshop_is_public(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workshops
    WHERE id = p_workshop_id AND status <> 'draft'
  );
$$;

CREATE POLICY "Co-leaders can read their workshops" ON public.workshops
  FOR SELECT TO authenticated
  USING (private.leads_workshop(id));

CREATE POLICY "Admins can delete workshops" ON public.workshops
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::public.app_role));

GRANT DELETE ON public.workshops TO authenticated;

ALTER TABLE public.workshop_co_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_co_leaders FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_co_leaders FROM anon, authenticated;
GRANT SELECT ON public.workshop_co_leaders TO anon, authenticated;
GRANT INSERT, DELETE ON public.workshop_co_leaders TO authenticated;

CREATE POLICY "Anyone can read the co-leaders of a public workshop" ON public.workshop_co_leaders
  FOR SELECT TO anon, authenticated
  USING (
    private.workshop_is_public(workshop_id)
    OR public.has_role('admin'::public.app_role)
    OR private.leads_workshop(workshop_id)
  );

CREATE POLICY "Admins can add co-leaders" ON public.workshop_co_leaders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can remove co-leaders" ON public.workshop_co_leaders
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::public.app_role));

ALTER TABLE public.workshop_online_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_online_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_online_links FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_online_links TO authenticated;

CREATE POLICY "Admins and leaders can read the meeting link" ON public.workshop_online_links
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role) OR private.leads_workshop(workshop_id));

CREATE POLICY "Admins can add the meeting link" ON public.workshop_online_links
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can change the meeting link" ON public.workshop_online_links
  FOR UPDATE TO authenticated
  USING (public.has_role('admin'::public.app_role))
  WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can remove the meeting link" ON public.workshop_online_links
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::public.app_role));

-- ------------------------------------------------------------ the blocks

ALTER TABLE public.specialist_time_off
  ADD COLUMN workshop_id uuid REFERENCES public.workshops (id) ON DELETE CASCADE;
ALTER TABLE public.room_availability_exceptions
  ADD COLUMN workshop_id uuid REFERENCES public.workshops (id) ON DELETE CASCADE;

CREATE INDEX specialist_time_off_workshop_idx
  ON public.specialist_time_off (workshop_id) WHERE workshop_id IS NOT NULL;
CREATE INDEX room_availability_exceptions_workshop_idx
  ON public.room_availability_exceptions (workshop_id) WHERE workshop_id IS NOT NULL;

-- A workshop's room block changes only with the workshop.
DROP POLICY "Admins can insert room availability exceptions" ON public.room_availability_exceptions;
DROP POLICY "Admins can update room availability exceptions" ON public.room_availability_exceptions;
DROP POLICY "Admins can delete room availability exceptions" ON public.room_availability_exceptions;

CREATE POLICY "Admins can insert room availability exceptions" ON public.room_availability_exceptions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin'::public.app_role) AND workshop_id IS NULL);

CREATE POLICY "Admins can update room availability exceptions" ON public.room_availability_exceptions
  FOR UPDATE TO authenticated
  USING (public.has_role('admin'::public.app_role) AND workshop_id IS NULL)
  WITH CHECK (public.has_role('admin'::public.app_role) AND workshop_id IS NULL);

CREATE POLICY "Admins can delete room availability exceptions" ON public.room_availability_exceptions
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::public.app_role) AND workshop_id IS NULL);

-- delete_time_off, as before, but a workshop's time off stays.
CREATE OR REPLACE FUNCTION public.delete_time_off(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  owner_id uuid;
  v_workshop_id uuid;
BEGIN
  SELECT specialist_id, workshop_id INTO owner_id, v_workshop_id
  FROM public.specialist_time_off
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END;
  IF v_workshop_id IS NOT NULL THEN
    RAISE EXCEPTION 'This time belongs to a workshop'
      USING ERRCODE = 'P0001', HINT = 'workshop_block';
  END IF;

  DELETE FROM public.specialist_time_off WHERE id = p_id;
END;
$$;

-- Writes a workshop's blocks again from its current state: none for a
-- draft or a cancelled one. Refuses a leader or room that is busy then.
CREATE OR REPLACE FUNCTION private.sync_workshop_blocks(p_workshop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
  v_tz text;
  v_step integer;
  v_during tstzrange;
  v_leader uuid;
  v_day date;
  v_from integer;
  v_to integer;
BEGIN
  DELETE FROM public.specialist_time_off WHERE workshop_id = p_workshop_id;
  DELETE FROM public.room_availability_exceptions WHERE workshop_id = p_workshop_id;

  SELECT * INTO v_workshop FROM public.workshops WHERE id = p_workshop_id;
  IF NOT FOUND OR v_workshop.status IN ('draft', 'cancelled') THEN
    RETURN;
  END IF;

  SELECT timezone, slot_step_minutes INTO v_tz, v_step
  FROM public.center_settings WHERE id = 1;
  v_during := tstzrange(v_workshop.starts_at, v_workshop.ends_at);

  FOR v_leader IN
    SELECT v_workshop.specialist_id
    UNION
    SELECT co.specialist_id FROM public.workshop_co_leaders AS co
    WHERE co.workshop_id = p_workshop_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_leader, 0));
    IF EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.specialist_id = v_leader
        AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
        AND visit.blocks && v_during
    ) THEN
      RAISE EXCEPTION 'The leader has a visit then'
        USING ERRCODE = '23P01', HINT = 'specialist_busy',
          DETAIL = jsonb_build_object('specialist', private.specialist_display_name(v_leader))::text;
    END IF;
    BEGIN
      INSERT INTO public.specialist_time_off (specialist_id, during, reason, workshop_id)
      VALUES (v_leader, v_during, left('Warsztat: ' || v_workshop.title, 500), p_workshop_id);
    EXCEPTION WHEN exclusion_violation THEN
      RAISE EXCEPTION 'The leader is away or leads another workshop then'
        USING ERRCODE = '23P01', HINT = 'specialist_away',
          DETAIL = jsonb_build_object('specialist', private.specialist_display_name(v_leader))::text;
    END;
  END LOOP;

  IF v_workshop.room_id IS NULL THEN
    RETURN;
  END IF;

  v_day := (v_workshop.starts_at AT TIME ZONE v_tz)::date;
  IF (v_workshop.ends_at AT TIME ZONE v_tz)::date <> v_day THEN
    RAISE EXCEPTION 'A workshop in a room ends on the day it starts'
      USING ERRCODE = '23514', HINT = 'one_day';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshops AS other
    WHERE other.room_id = v_workshop.room_id
      AND other.id <> p_workshop_id
      AND other.status NOT IN ('draft', 'cancelled')
      AND tstzrange(other.starts_at, other.ends_at) && v_during
  ) OR EXISTS (
    SELECT 1 FROM public.appointments AS visit
    WHERE visit.room_id = v_workshop.room_id
      AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
      AND visit.blocks && v_during
  ) THEN
    RAISE EXCEPTION 'The room is taken then' USING ERRCODE = '23P01', HINT = 'room_busy';
  END IF;

  -- On the centre's grid (room blocks must be), widened outwards.
  v_from := floor(extract(epoch FROM (v_workshop.starts_at AT TIME ZONE v_tz)::time) / 60)::integer;
  v_to := ceil(extract(epoch FROM (v_workshop.ends_at AT TIME ZONE v_tz)::time) / 60)::integer;
  v_from := (v_from / v_step) * v_step;
  v_to := ((v_to + v_step - 1) / v_step) * v_step;
  BEGIN
    INSERT INTO public.room_availability_exceptions (
      room_id, date, type, starts_at, ends_at, reason, workshop_id
    )
    VALUES (
      v_workshop.room_id, v_day, 'blocked_interval',
      time '00:00' + make_interval(mins => v_from),
      CASE WHEN v_to >= 1440 THEN time '24:00' ELSE time '00:00' + make_interval(mins => v_to) END,
      left('Warsztat: ' || v_workshop.title, 500), p_workshop_id
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'The room is taken then' USING ERRCODE = '23P01', HINT = 'room_busy';
  END;
END;
$$;

-- ------------------------------------------------------------ registrations

CREATE TYPE public.workshop_registration_status AS ENUM (
  'held', 'awaiting_payment', 'confirmed', 'waitlisted', 'offered', 'cancelled', 'expired'
);

CREATE TABLE public.workshop_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE RESTRICT,
  reference text NOT NULL UNIQUE,
  status public.workshop_registration_status NOT NULL DEFAULT 'held',
  booked_by text NOT NULL DEFAULT 'client' CHECK (booked_by IN ('client', 'centre')),
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  access_token_hash bytea NOT NULL UNIQUE,
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  currency_code text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  paid_minor integer NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  refund_due_minor integer NOT NULL DEFAULT 0,
  refunded_minor integer NOT NULL DEFAULT 0,
  -- Cancelled late and paid: refunded once the waitlist takes the seat.
  refund_when_replaced boolean NOT NULL DEFAULT false,
  hold_expires_at timestamptz,
  payment_due_at timestamptz,
  offer_expires_at timestamptz,
  waitlisted_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text CHECK (cancelled_by IS NULL OR cancelled_by IN ('client', 'centre', 'system')),
  attended boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workshop_registrations_client_lengths CHECK (
    (client_name IS NULL OR char_length(client_name) BETWEEN 1 AND 200)
    AND (client_email IS NULL OR (char_length(client_email) <= 320 AND client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'))
    AND (client_phone IS NULL OR char_length(client_phone) BETWEEN 3 AND 40)
    AND (client_notes IS NULL OR char_length(client_notes) <= 1000)
  ),
  CONSTRAINT workshop_registrations_details_when_kept CHECK (
    status IN ('held', 'cancelled', 'expired')
    OR (
      client_name IS NOT NULL AND client_email IS NOT NULL
      AND (booked_by = 'centre' OR (terms_accepted_at IS NOT NULL AND privacy_accepted_at IS NOT NULL))
    )
  ),
  CONSTRAINT workshop_registrations_hold_expires CHECK (status <> 'held' OR hold_expires_at IS NOT NULL),
  CONSTRAINT workshop_registrations_offer_expires CHECK (status <> 'offered' OR offer_expires_at IS NOT NULL),
  CONSTRAINT workshop_registrations_payment_due CHECK (status <> 'awaiting_payment' OR payment_due_at IS NOT NULL),
  CONSTRAINT workshop_registrations_refund_valid CHECK (
    refund_due_minor BETWEEN 0 AND paid_minor AND refunded_minor BETWEEN 0 AND paid_minor
  )
);

CREATE INDEX workshop_registrations_workshop_idx
  ON public.workshop_registrations (workshop_id, status);
-- One registration per e-mail on a workshop (the waitlist included).
CREATE UNIQUE INDEX workshop_registrations_one_per_email
  ON public.workshop_registrations (workshop_id, lower(client_email))
  WHERE status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered');

CREATE TRIGGER set_workshop_registrations_updated_at
  BEFORE UPDATE ON public.workshop_registrations
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_registrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_registrations FROM anon, authenticated;
GRANT SELECT (
  id, workshop_id, reference, status, booked_by, client_name, client_email,
  client_phone, client_notes, terms_accepted_at, privacy_accepted_at,
  price_minor, currency_code, paid_minor, refund_due_minor, refunded_minor,
  refund_when_replaced, hold_expires_at, payment_due_at, offer_expires_at,
  waitlisted_at, confirmed_at, cancelled_at, cancelled_by, attended,
  created_at, updated_at
) ON public.workshop_registrations TO authenticated;

CREATE POLICY "Admins and leaders can read registrations" ON public.workshop_registrations
  FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role) OR private.leads_workshop(workshop_id));

-- Whether a registration takes a seat now.
CREATE OR REPLACE FUNCTION private.workshop_seat_taken(
  p_status public.workshop_registration_status,
  p_hold_expires_at timestamptz,
  p_payment_due_at timestamptz,
  p_offer_expires_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT p_status = 'confirmed'
    OR (p_status = 'awaiting_payment' AND p_payment_due_at > now())
    OR (p_status = 'held' AND p_hold_expires_at > now())
    OR (p_status = 'offered' AND p_offer_expires_at > now());
$$;

CREATE OR REPLACE FUNCTION private.workshop_seats_taken(p_workshop_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT count(*)::integer FROM public.workshop_registrations AS r
  WHERE r.workshop_id = p_workshop_id
    AND private.workshop_seat_taken(r.status, r.hold_expires_at, r.payment_due_at, r.offer_expires_at);
$$;

-- Gives free seats to the waitlist, first come first served: each gets
-- 24 hours (at most until the start) to take it. Callers change seats
-- with the workshop locked first; the lock here keeps that true.
CREATE OR REPLACE FUNCTION private.offer_workshop_seats(p_workshop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
  v_free integer;
  v_offered integer := 0;
  v_next uuid;
BEGIN
  SELECT * INTO v_workshop FROM public.workshops WHERE id = p_workshop_id FOR UPDATE;
  IF NOT FOUND OR v_workshop.status <> 'published' OR v_workshop.starts_at <= now() THEN
    RETURN 0;
  END IF;
  v_free := v_workshop.capacity - private.workshop_seats_taken(p_workshop_id);
  WHILE v_free > 0 LOOP
    SELECT r.id INTO v_next FROM public.workshop_registrations AS r
    WHERE r.workshop_id = p_workshop_id AND r.status = 'waitlisted'
    ORDER BY r.waitlisted_at, r.created_at
    LIMIT 1
    FOR UPDATE;
    EXIT WHEN NOT FOUND;
    UPDATE public.workshop_registrations
    SET status = 'offered',
        offer_expires_at = least(now() + interval '24 hours', v_workshop.starts_at)
    WHERE id = v_next;
    v_free := v_free - 1;
    v_offered := v_offered + 1;
  END LOOP;
  RETURN v_offered;
END;
$$;

-- Ends holds, offers and unpaid seats whose time is up (one workshop, or
-- all). Freed seats go on to the waitlist through the trigger below.
CREATE OR REPLACE FUNCTION private.expire_workshop_registrations(p_workshop_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.workshop_registrations AS r
  SET status = CASE WHEN r.status = 'awaiting_payment'
        THEN 'cancelled' ELSE 'expired' END::public.workshop_registration_status,
      cancelled_at = CASE WHEN r.status = 'awaiting_payment' THEN now() END,
      cancelled_by = CASE WHEN r.status = 'awaiting_payment' THEN 'system' END
  WHERE (p_workshop_id IS NULL OR r.workshop_id = p_workshop_id)
    AND (
      (r.status = 'held' AND r.hold_expires_at <= now())
      OR (r.status = 'offered' AND r.offer_expires_at <= now())
      OR (r.status = 'awaiting_payment' AND r.payment_due_at <= now())
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- After a registration changes: a freed seat goes to the waitlist; a seat
-- the waitlist took refunds the oldest late cancellation; enough paid
-- seats confirm the workshop.
CREATE OR REPLACE FUNCTION private.workshop_registration_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
BEGIN
  IF NEW.status IN ('cancelled', 'expired') AND OLD.status NOT IN ('cancelled', 'expired', 'waitlisted') THEN
    PERFORM private.offer_workshop_seats(NEW.workshop_id);
  END IF;

  IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    IF NEW.waitlisted_at IS NOT NULL THEN
      UPDATE public.workshop_registrations
      SET refund_due_minor = paid_minor, refund_when_replaced = false
      WHERE id = (
        SELECT r.id FROM public.workshop_registrations AS r
        WHERE r.workshop_id = NEW.workshop_id AND r.refund_when_replaced
        ORDER BY r.cancelled_at, r.created_at
        LIMIT 1
      );
    END IF;
    SELECT * INTO v_workshop FROM public.workshops WHERE id = NEW.workshop_id;
    IF v_workshop.confirmed_at IS NULL
       AND v_workshop.min_participants IS NOT NULL
       AND (
         SELECT count(*) FROM public.workshop_registrations AS r
         WHERE r.workshop_id = NEW.workshop_id AND r.status = 'confirmed'
       ) >= v_workshop.min_participants
    THEN
      UPDATE public.workshops SET confirmed_at = now() WHERE id = NEW.workshop_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER workshop_registration_changed
  AFTER UPDATE OF status ON public.workshop_registrations
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION private.workshop_registration_changed();

-- ------------------------------------------------------------ workshop changes

CREATE OR REPLACE FUNCTION private.workshop_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'A cancelled workshop stays cancelled'
        USING ERRCODE = '23514', HINT = 'workshop_cancelled';
    END IF;
    IF NEW.capacity < OLD.capacity
       AND NEW.capacity < private.workshop_seats_taken(NEW.id)
    THEN
      RAISE EXCEPTION 'Fewer seats than people registered'
        USING ERRCODE = '23514', HINT = 'capacity_below_taken';
    END IF;
  END IF;
  IF NEW.status = 'cancelled' AND (TG_OP = 'INSERT' OR OLD.status <> 'cancelled') THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER workshop_check
  BEFORE INSERT OR UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION private.workshop_check();

CREATE OR REPLACE FUNCTION private.workshop_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.starts_at IS DISTINCT FROM NEW.starts_at
     OR OLD.ends_at IS DISTINCT FROM NEW.ends_at
     OR OLD.specialist_id IS DISTINCT FROM NEW.specialist_id
     OR OLD.room_id IS DISTINCT FROM NEW.room_id
     OR OLD.title IS DISTINCT FROM NEW.title
  THEN
    PERFORM private.sync_workshop_blocks(NEW.id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    -- The centre cancels: everyone's seat goes, with a full refund.
    UPDATE public.workshop_registrations AS r
    SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre',
        refund_due_minor = r.paid_minor, refund_when_replaced = false
    WHERE r.workshop_id = NEW.id
      AND r.status IN ('held', 'awaiting_payment', 'confirmed', 'waitlisted', 'offered');
    -- Late cancellations waiting for a replacement are refunded too.
    UPDATE public.workshop_registrations AS r
    SET refund_due_minor = r.paid_minor, refund_when_replaced = false
    WHERE r.workshop_id = NEW.id AND r.refund_when_replaced;
  ELSIF TG_OP = 'UPDATE' AND NEW.capacity > OLD.capacity THEN
    PERFORM private.offer_workshop_seats(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER workshop_changed
  AFTER INSERT OR UPDATE ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION private.workshop_changed();

CREATE OR REPLACE FUNCTION private.workshop_co_leaders_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.sync_workshop_blocks(coalesce(NEW.workshop_id, OLD.workshop_id));
  RETURN NULL;
END;
$$;

CREATE TRIGGER workshop_co_leaders_changed
  AFTER INSERT OR DELETE ON public.workshop_co_leaders
  FOR EACH ROW EXECUTE FUNCTION private.workshop_co_leaders_changed();

-- ------------------------------------------------------------ the site

-- Seats and registration for public workshops (and, for staff, their own
-- drafts): what the list and the workshop page show.
CREATE OR REPLACE FUNCTION public.workshop_availability(p_ids uuid[])
RETURNS TABLE (
  workshop_id uuid,
  seats_left integer,
  waitlist_count integer,
  registration_open boolean,
  confirmed boolean,
  pay_later_until timestamptz,
  full_refund_until timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT w.id,
    greatest(w.capacity - private.workshop_seats_taken(w.id), 0),
    (SELECT count(*)::integer FROM public.workshop_registrations AS r
      WHERE r.workshop_id = w.id AND r.status = 'waitlisted'),
    w.status = 'published' AND w.registration_enabled
      AND now() < private.workshop_closes_at(w.registration_closes_at, w.starts_at),
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.starts_at - private.workshop_notice(),
    w.starts_at - private.workshop_notice()
  FROM public.workshops AS w
  WHERE w.id = ANY (p_ids)
    AND (
      w.status <> 'draft'
      OR public.has_role('admin'::public.app_role)
      OR private.leads_workshop(w.id)
    );
$$;

-- The registration row for a guest's token, locked.
CREATE OR REPLACE FUNCTION private.workshop_registration_by_token(p_access_token text)
RETURNS public.workshop_registrations
LANGUAGE sql
SET search_path TO ''
AS $$
  SELECT r.* FROM public.workshop_registrations AS r
  WHERE r.access_token_hash = extensions.digest(coalesce(p_access_token, ''), 'sha256')
  FOR UPDATE;
$$;

-- A workshop open for registration, locked (one seat counter at a time).
CREATE OR REPLACE FUNCTION private.open_workshop(p_slug text)
RETURNS public.workshops
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
BEGIN
  SELECT * INTO v_workshop FROM public.workshops
  WHERE slug = p_slug AND status <> 'draft'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workshop not found' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  IF v_workshop.status <> 'published'
     OR NOT v_workshop.registration_enabled
     OR now() >= private.workshop_closes_at(v_workshop.registration_closes_at, v_workshop.starts_at)
  THEN
    RAISE EXCEPTION 'Registration is closed' USING HINT = 'registration_closed';
  END IF;
  RETURN v_workshop;
END;
$$;

-- At most five holds or waitlist sign-ups per visitor in 15 minutes.
CREATE OR REPLACE FUNCTION private.count_workshop_attempt(p_client_key text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF p_client_key IS NULL OR char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:visitor:' || p_client_key, 0));
  DELETE FROM private.booking_holds WHERE created_at < now() - interval '1 hour';
  IF (
    SELECT count(*) FROM private.booking_holds AS attempt
    WHERE attempt.client_key = p_client_key
      AND attempt.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many holds, try again later' USING HINT = 'too_many_holds';
  END IF;
  INSERT INTO private.booking_holds (client_key) VALUES (p_client_key);
END;
$$;

-- Refuses an e-mail already registered (or waiting) for the workshop.
CREATE OR REPLACE FUNCTION private.require_new_participant(
  p_workshop_id uuid, p_email text, p_except uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations AS r
    WHERE r.workshop_id = p_workshop_id
      AND r.id IS DISTINCT FROM p_except
      AND lower(r.client_email) = lower(btrim(p_email))
      AND r.status IN ('awaiting_payment', 'confirmed', 'waitlisted', 'offered')
  ) THEN
    RAISE EXCEPTION 'Already registered' USING HINT = 'already_registered';
  END IF;
END;
$$;

-- Holds a seat for the hold time (as for visits); the guest then gives
-- their details and pays, reserves or (free) confirms.
CREATE OR REPLACE FUNCTION public.hold_workshop_seat(p_slug text, p_client_key text)
RETURNS TABLE (registration_id uuid, reference text, access_token text, hold_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_workshop public.workshops%ROWTYPE;
  v_token text;
  v_reference text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  PERFORM private.count_workshop_attempt(p_client_key);
  v_workshop := private.open_workshop(p_slug);
  PERFORM private.expire_workshop_registrations(v_workshop.id);
  IF private.workshop_seats_taken(v_workshop.id) >= v_workshop.capacity THEN
    RAISE EXCEPTION 'The workshop is full' USING HINT = 'full';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reference := 'W' || private.next_booking_reference(now(), v_settings.timezone);
  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  INSERT INTO public.workshop_registrations (
    workshop_id, reference, status, access_token_hash, price_minor,
    currency_code, hold_expires_at
  )
  VALUES (
    v_workshop.id, v_reference, 'held', extensions.digest(v_token, 'sha256'),
    v_workshop.price_minor, v_workshop.currency_code, v_expires
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_reference, v_token, v_expires;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_workshop_registration_details(
  p_access_token text,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR NOT (
    (v_registration.status = 'held' AND v_registration.hold_expires_at > now())
    OR (v_registration.status = 'offered' AND v_registration.offer_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF NOT coalesce(p_accept_terms, false) OR NOT coalesce(p_accept_privacy, false) THEN
    RAISE EXCEPTION 'The terms and the privacy policy must be accepted'
      USING HINT = 'consent_required';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);

  BEGIN
    UPDATE public.workshop_registrations
    SET client_name = nullif(btrim(p_name), ''),
        client_email = lower(nullif(btrim(p_email), '')),
        client_phone = nullif(btrim(p_phone), ''),
        client_notes = nullif(btrim(p_notes), ''),
        terms_accepted_at = coalesce(terms_accepted_at, now()),
        privacy_accepted_at = coalesce(privacy_accepted_at, now())
    WHERE id = v_registration.id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL
      FROM public.workshop_registrations WHERE id = v_registration.id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;

-- The held (or offered) seat ready for its next step.
CREATE OR REPLACE FUNCTION private.ready_workshop_seat(p_access_token text)
RETURNS public.workshop_registrations
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR NOT (
    (v_registration.status = 'held' AND v_registration.hold_expires_at > now())
    OR (v_registration.status = 'offered' AND v_registration.offer_expires_at > now())
  ) THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_registration.client_email IS NULL OR v_registration.terms_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The participant''s details come first' USING HINT = 'details_required';
  END IF;
  RETURN v_registration;
END;
$$;

-- "Zapłacę później": the seat waits for payment until seven days before.
CREATE OR REPLACE FUNCTION public.reserve_workshop_seat(p_access_token text)
RETURNS TABLE (reference text, payment_due_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_due timestamptz;
BEGIN
  v_registration := private.ready_workshop_seat(p_access_token);
  IF v_registration.price_minor = 0 THEN
    RAISE EXCEPTION 'A free seat is confirmed, not reserved' USING HINT = 'free';
  END IF;
  SELECT w.starts_at - private.workshop_notice() INTO v_due
  FROM public.workshops AS w WHERE w.id = v_registration.workshop_id;
  IF v_due <= now() THEN
    RAISE EXCEPTION 'This workshop is paid at once' USING HINT = 'pay_now_required';
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'awaiting_payment', hold_expires_at = NULL, offer_expires_at = NULL,
      payment_due_at = v_due
  WHERE id = v_registration.id;
  RETURN QUERY SELECT v_registration.reference, v_due;
END;
$$;

-- A free seat (price 0) is confirmed without a payment.
CREATE OR REPLACE FUNCTION public.confirm_free_workshop_seat(p_access_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.ready_workshop_seat(p_access_token);
  IF v_registration.price_minor > 0 THEN
    RAISE EXCEPTION 'This seat is paid for' USING HINT = 'payment_required';
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'confirmed', confirmed_at = now(),
      hold_expires_at = NULL, offer_expires_at = NULL
  WHERE id = v_registration.id;
  RETURN v_registration.reference;
END;
$$;

-- Signs up for the waitlist of a full workshop.
CREATE OR REPLACE FUNCTION public.join_workshop_waitlist(
  p_slug text,
  p_client_key text,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
RETURNS TABLE (reference text, access_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_workshop public.workshops%ROWTYPE;
  v_token text;
  v_reference text;
BEGIN
  PERFORM private.count_workshop_attempt(p_client_key);
  v_workshop := private.open_workshop(p_slug);
  PERFORM private.expire_workshop_registrations(v_workshop.id);
  IF private.workshop_seats_taken(v_workshop.id) < v_workshop.capacity THEN
    RAISE EXCEPTION 'There are free seats' USING HINT = 'seats_free';
  END IF;
  IF NOT coalesce(p_accept_terms, false) OR NOT coalesce(p_accept_privacy, false) THEN
    RAISE EXCEPTION 'The terms and the privacy policy must be accepted'
      USING HINT = 'consent_required';
  END IF;
  PERFORM private.require_new_participant(v_workshop.id, p_email, NULL);

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reference := 'W' || private.next_booking_reference(
    now(), (SELECT timezone FROM public.center_settings WHERE id = 1)
  );
  BEGIN
    INSERT INTO public.workshop_registrations (
      workshop_id, reference, status, access_token_hash, price_minor,
      currency_code, waitlisted_at, client_name, client_email, client_phone,
      client_notes, terms_accepted_at, privacy_accepted_at
    )
    VALUES (
      v_workshop.id, v_reference, 'waitlisted', extensions.digest(v_token, 'sha256'),
      -- The waitlist's order: the clock, not the transaction's start.
      v_workshop.price_minor, v_workshop.currency_code, clock_timestamp(),
      nullif(btrim(p_name), ''), lower(nullif(btrim(p_email), '')),
      nullif(btrim(p_phone), ''), nullif(btrim(p_notes), ''), now(), now()
    );
  EXCEPTION
    WHEN check_violation OR not_null_violation THEN
      RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
    WHEN unique_violation THEN
      RAISE EXCEPTION 'Already registered' USING HINT = 'already_registered';
  END;

  RETURN QUERY SELECT v_reference, v_token;
END;
$$;

-- A guest's registration, for its page: the state, the deadlines, and the
-- meeting link once the seat is confirmed.
CREATE OR REPLACE FUNCTION public.get_workshop_registration(p_access_token text)
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
  meeting_url text
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
    r.client_email IS NOT NULL AND r.terms_accepted_at IS NOT NULL,
    r.hold_expires_at, r.payment_due_at, r.offer_expires_at,
    CASE WHEN r.status = 'waitlisted' THEN (
      SELECT count(*)::integer + 1 FROM public.workshop_registrations AS ahead
      WHERE ahead.workshop_id = r.workshop_id AND ahead.status = 'waitlisted'
        AND (ahead.waitlisted_at, ahead.created_at) < (r.waitlisted_at, r.created_at)
    ) END,
    w.starts_at - private.workshop_notice(),
    r.price_minor > 0 AND w.starts_at - private.workshop_notice() > now(),
    r.cancelled_by,
    CASE WHEN r.status = 'confirmed' AND w.status = 'published' THEN link.meeting_url END
  FROM public.workshop_registrations AS r
  JOIN public.workshops AS w ON w.id = r.workshop_id
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_online_links AS link ON link.workshop_id = w.id
  WHERE r.access_token_hash = extensions.digest(coalesce(p_access_token, ''), 'sha256');
$$;

-- The guest gives up their seat (or waitlist place). Paid and more than
-- seven days before: a full refund; later: a refund once the waitlist
-- takes the seat. Returns the amount to refund now.
CREATE OR REPLACE FUNCTION public.cancel_workshop_registration(p_access_token text)
RETURNS TABLE (reference text, refund_minor integer, refund_when_replaced boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_workshop_id uuid;
  v_starts_at timestamptz;
  v_registration public.workshop_registrations%ROWTYPE;
  v_full boolean := false;
  v_later boolean := false;
BEGIN
  SELECT r.workshop_id INTO v_workshop_id FROM public.workshop_registrations AS r
  WHERE r.access_token_hash = extensions.digest(coalesce(p_access_token, ''), 'sha256');
  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Nothing to cancel' USING HINT = 'already_cancelled';
  END IF;
  -- The workshop first, then the seat (the order every seat change keeps).
  SELECT w.starts_at INTO v_starts_at FROM public.workshops AS w
  WHERE w.id = v_workshop_id FOR UPDATE;
  PERFORM private.expire_workshop_registrations(v_workshop_id);
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Nothing to cancel' USING HINT = 'already_cancelled';
  END IF;
  IF now() >= v_starts_at THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;

  IF v_registration.status = 'confirmed' AND v_registration.paid_minor > v_registration.refunded_minor THEN
    v_full := now() < v_starts_at - private.workshop_notice();
    v_later := NOT v_full;
  END IF;

  UPDATE public.workshop_registrations
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
      refund_due_minor = CASE WHEN v_full THEN paid_minor ELSE refunded_minor END,
      refund_when_replaced = v_later,
      hold_expires_at = NULL, offer_expires_at = NULL
  WHERE id = v_registration.id;
  RETURN QUERY SELECT v_registration.reference,
    CASE WHEN v_full THEN v_registration.paid_minor - v_registration.refunded_minor ELSE 0 END,
    v_later;
END;
$$;

-- The participant passes their seat to someone else (no refund).
CREATE OR REPLACE FUNCTION public.transfer_workshop_seat(
  p_access_token text, p_name text, p_email text, p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR v_registration.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'Only a booked seat can be passed on' USING HINT = 'not_transferable';
  END IF;
  IF now() >= (SELECT starts_at FROM public.workshops WHERE id = v_registration.workshop_id) THEN
    RAISE EXCEPTION 'The workshop has started' USING HINT = 'too_late';
  END IF;
  PERFORM private.require_new_participant(v_registration.workshop_id, p_email, v_registration.id);
  BEGIN
    UPDATE public.workshop_registrations
    SET client_name = nullif(btrim(p_name), ''),
        client_email = lower(nullif(btrim(p_email), '')),
        client_phone = nullif(btrim(p_phone), ''),
        client_notes = NULL
    WHERE id = v_registration.id;
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
END;
$$;

-- For the scheduled job: ends what has run out, one workshop at a time
-- (each locked first, like every other seat change).
CREATE OR REPLACE FUNCTION public.run_workshop_jobs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_total integer := 0;
BEGIN
  FOR v_id IN
    SELECT DISTINCT r.workshop_id FROM public.workshop_registrations AS r
    WHERE (r.status = 'held' AND r.hold_expires_at <= now())
      OR (r.status = 'offered' AND r.offer_expires_at <= now())
      OR (r.status = 'awaiting_payment' AND r.payment_due_at <= now())
  LOOP
    PERFORM 1 FROM public.workshops WHERE id = v_id FOR UPDATE;
    v_total := v_total + private.expire_workshop_registrations(v_id);
  END LOOP;
  RETURN v_total;
END;
$$;

-- ------------------------------------------------------------ the admin

-- The admin confirms the workshop will go ahead (without the minimum).
CREATE OR REPLACE FUNCTION public.confirm_workshop(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins manage workshops' USING ERRCODE = '42501';
  END IF;
  UPDATE public.workshops SET confirmed_at = coalesce(confirmed_at, now())
  WHERE id = p_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a published workshop is confirmed' USING HINT = 'not_published';
  END IF;
END;
$$;

-- The admin cancels the workshop; returns the participants to refund.
CREATE OR REPLACE FUNCTION public.cancel_workshop(p_id uuid, p_reason text DEFAULT NULL)
RETURNS TABLE (registration_id uuid, reference text, client_email text, refund_minor integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins manage workshops' USING ERRCODE = '42501';
  END IF;
  UPDATE public.workshops
  SET status = 'cancelled', cancel_reason = nullif(btrim(p_reason), '')
  WHERE id = p_id AND status IN ('draft', 'published');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This workshop cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;
  RETURN QUERY
  SELECT r.id, r.reference, r.client_email, r.refund_due_minor - r.refunded_minor
  FROM public.workshop_registrations AS r
  WHERE r.workshop_id = p_id AND r.refund_due_minor > r.refunded_minor
  ORDER BY r.created_at;
END;
$$;

-- ------------------------------------------------------------ access

REVOKE ALL ON FUNCTION private.workshop_notice() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_closes_at(timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.leads_workshop(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_is_public(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.sync_workshop_blocks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_seat_taken(public.workshop_registration_status, timestamptz, timestamptz, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_seats_taken(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.offer_workshop_seats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.expire_workshop_registrations(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.workshop_registration_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.open_workshop(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.count_workshop_attempt(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.require_new_participant(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.ready_workshop_seat(text) FROM PUBLIC;
-- The policies call these as the signed-in user or the visitor.
GRANT EXECUTE ON FUNCTION private.leads_workshop(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.workshop_is_public(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.workshop_availability(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workshop_availability(uuid[]) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.hold_workshop_seat(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.save_workshop_registration_details(text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_workshop_seat(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_free_workshop_seat(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.join_workshop_waitlist(text, text, text, text, text, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_workshop_registration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_workshop_registration(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transfer_workshop_seat(text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.run_workshop_jobs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_workshop_seat(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.save_workshop_registration_details(text, text, text, text, text, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_workshop_seat(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_free_workshop_seat(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.join_workshop_waitlist(text, text, text, text, text, text, boolean, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_workshop_registration(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_workshop_registration(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transfer_workshop_seat(text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.run_workshop_jobs() TO service_role;

REVOKE ALL ON FUNCTION public.confirm_workshop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_workshop(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_workshop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_workshop(uuid, text) TO authenticated;
