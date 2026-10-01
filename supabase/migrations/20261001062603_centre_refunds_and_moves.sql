-- The centre settles visits its own way (docs/product/booking-plan.md, R12):
-- an admin cancels at any time and chooses how much to give back (all of it
-- by default, less to keep costs for a late cancellation), gives money back
-- later on a visit already cancelled or held, and moves a visit to any free
-- time, room or form, without the client's windows and limits. Admins only.
-- Stripe refunds the amount the database allowed; the reason goes into the
-- visit's history and the client's e-mail.

ALTER TABLE public.appointment_events DROP CONSTRAINT appointment_events_kind_check;
ALTER TABLE public.appointment_events ADD CONSTRAINT appointment_events_kind_check CHECK (
  kind IN ('created', 'details_saved', 'hold_released', 'hold_expired',
           'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
           'payment_started', 'payment_succeeded', 'payment_failed',
           'payment_expired', 'refund_recorded', 'email_sent', 'reserved',
           'refund_issued')
);

-- Why the centre changed a visit, for the history (set for one statement).
CREATE FUNCTION private.change_reason()
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT nullif(current_setting('kolor.change_reason', true), '');
$function$;
REVOKE ALL ON FUNCTION private.change_reason() FROM PUBLIC, anon, authenticated;

-- The history: a cancellation and a move carry the centre's reason.
CREATE OR REPLACE FUNCTION private.appointment_events_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.id, 'created',
      CASE WHEN NEW.booked_by = 'centre' THEN 'centre' ELSE 'client' END,
      jsonb_strip_nulls(jsonb_build_object(
        'reference', NEW.reference,
        'starts_at', lower(NEW.during), 'ends_at', upper(NEW.during),
        'mode', NEW.mode, 'price_minor', NEW.price_minor, 'currency_code', NEW.currency_code,
        'status', NEW.status, 'payment_due_at', NEW.payment_due_at
      )));
    RETURN NEW;
  END IF;

  IF OLD.terms_accepted_at IS NULL AND NEW.terms_accepted_at IS NOT NULL THEN
    PERFORM private.log_appointment_event(NEW.id, 'details_saved', 'client');
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'expired' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_expired', 'system',
        jsonb_build_object('from', OLD.status));
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'held' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_released', 'client');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM private.log_appointment_event(NEW.id, 'cancelled',
        CASE NEW.cancelled_by WHEN 'centre' THEN 'centre' WHEN 'system' THEN 'system' ELSE 'client' END,
        jsonb_strip_nulls(jsonb_build_object(
          'from', OLD.status, 'refund_due_minor', NEW.refund_due_minor,
          'reason', CASE WHEN NEW.cancelled_by = 'system' THEN 'unpaid'
                         WHEN NEW.cancelled_by = 'centre' THEN private.change_reason() END
        )));
    ELSIF NEW.status = 'awaiting_payment' AND OLD.status = 'held' AND NEW.payment_due_at IS NOT NULL THEN
      PERFORM private.log_appointment_event(NEW.id, 'reserved', 'client',
        jsonb_build_object('payment_due_at', NEW.payment_due_at));
    ELSIF NEW.status = 'awaiting_payment' THEN
      PERFORM private.log_appointment_event(NEW.id, 'awaiting_payment', 'payment');
    ELSIF NEW.status = 'confirmed' THEN
      PERFORM private.log_appointment_event(NEW.id, 'confirmed', 'payment',
        jsonb_build_object('from', OLD.status));
    END IF;
  END IF;

  IF (NEW.during IS DISTINCT FROM OLD.during
      OR NEW.room_id IS DISTINCT FROM OLD.room_id
      OR NEW.mode IS DISTINCT FROM OLD.mode)
     AND OLD.status = NEW.status
     AND NEW.status IN ('confirmed', 'awaiting_payment') THEN
    PERFORM private.log_appointment_event(NEW.id, 'rescheduled',
      CASE WHEN NEW.reschedule_count > OLD.reschedule_count THEN 'client' ELSE 'centre' END,
      jsonb_strip_nulls(jsonb_build_object(
        'from_starts_at', lower(OLD.during), 'from_ends_at', upper(OLD.during),
        'to_starts_at', lower(NEW.during), 'to_ends_at', upper(NEW.during),
        'reason', CASE WHEN NEW.reschedule_count = OLD.reschedule_count THEN private.change_reason() END
      )));
  END IF;
  RETURN NEW;
END;
$function$;

-- How many times a visit has moved (the calendar event's version).
CREATE FUNCTION private.times_moved(p_appointment_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT count(*)::integer FROM public.appointment_events AS event
  WHERE event.appointment_id = p_appointment_id AND event.kind = 'rescheduled';
$function$;
REVOKE ALL ON FUNCTION private.times_moved(uuid) FROM PUBLIC, anon, authenticated;

-- The admin cancels: any time before or after, with the refund they choose
-- (null: all that is left of the payment), and why.
DROP FUNCTION public.centre_cancel_visit(uuid);
CREATE FUNCTION public.centre_cancel_visit(
  p_appointment_id uuid,
  p_refund_minor integer DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(reference text, refund_minor integer, payment_intent_id text, reschedule_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_paid boolean;
  v_left integer := 0;
  v_refund integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre cancels visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;

  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_paid := FOUND;
  IF v_paid THEN
    v_left := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;
  v_refund := coalesce(p_refund_minor, v_left);
  IF v_refund < 0 OR v_refund > v_left THEN
    RAISE EXCEPTION 'At most % can be given back', v_left USING HINT = 'refund_too_high';
  END IF;

  -- A payment still going on stops counting.
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  PERFORM set_config('kolor.change_reason', coalesce(left(btrim(p_reason), 500), ''), true);
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre',
      refund_due_minor = v_refund + CASE WHEN v_paid THEN v_payment.refunded_minor ELSE 0 END
  WHERE id = v_visit.id;
  PERFORM set_config('kolor.change_reason', '', true);

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END,
    private.times_moved(v_visit.id);
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_cancel_visit(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_cancel_visit(uuid, integer, text) TO authenticated, service_role;

-- The admin gives money back later (a late cancellation forgiven, a visit
-- that went wrong): up to what is left of the payment.
CREATE FUNCTION public.centre_refund_visit(
  p_appointment_id uuid,
  p_refund_minor integer,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(reference text, refund_minor integer, payment_intent_id text, refunded_before_minor integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_left integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre gives money back'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing was paid' USING HINT = 'not_paid';
  END IF;
  v_left := v_payment.amount_minor - v_payment.refunded_minor;
  IF p_refund_minor IS NULL OR p_refund_minor <= 0 OR p_refund_minor > v_left THEN
    RAISE EXCEPTION 'Between 1 and % can be given back', v_left USING HINT = 'refund_too_high';
  END IF;

  -- What the centre owes back: what it gave so far and this.
  UPDATE public.appointments
  SET refund_due_minor = greatest(coalesce(refund_due_minor, 0), v_payment.refunded_minor) + p_refund_minor
  WHERE id = v_visit.id;
  PERFORM private.log_appointment_event(v_visit.id, 'refund_issued', 'centre',
    jsonb_strip_nulls(jsonb_build_object(
      'refund_minor', p_refund_minor,
      'reason', nullif(left(btrim(coalesce(p_reason, '')), 500), '')
    )));

  RETURN QUERY SELECT v_visit.reference, p_refund_minor, v_payment.payment_intent_id,
    v_payment.refunded_minor;
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_refund_visit(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_refund_visit(uuid, integer, text) TO authenticated, service_role;

-- The admin moves a visit: to any time ahead, the same or another room or
-- form, whatever the client's windows; the specialist and the room must be
-- free (with the break after it), not away, not closed. A reservation not
-- paid yet gets its time to pay again from the new time.
CREATE FUNCTION public.centre_reschedule_visit(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_mode public.visit_mode,
  p_room_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(reference text, starts_at timestamptz, ends_at timestamptz, sequence integer, payment_due_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_settings public.center_settings%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_during tstzrange;
  v_day date;
  v_due timestamptz;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre moves visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be moved' USING HINT = 'not_reschedulable';
  END IF;
  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = v_visit.specialist_service_id;
  IF (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service is not given this way' USING HINT = 'not_bookable';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_visit.duration_minutes));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF p_mode = 'in_person' THEN
    SELECT * INTO v_room FROM public.rooms AS room WHERE room.id = p_room_id;
    IF NOT FOUND OR NOT v_room.active OR NOT EXISTS (
      SELECT 1 FROM public.locations AS location
      WHERE location.id = v_room.location_id AND location.active
    ) THEN
      RAISE EXCEPTION 'Choose an open room' USING HINT = 'room_required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS closed
      WHERE closed.room_id = v_room.id
        AND closed.date = v_day
        AND (
          closed.type = 'closed_all_day'
          OR (
            closed.type = 'blocked_interval'
            AND tstzrange(
              (closed.date + closed.starts_at) AT TIME ZONE v_settings.timezone,
              (closed.date + closed.ends_at) AT TIME ZONE v_settings.timezone
            ) && v_during
          )
        )
    ) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_visit.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  IF v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at IS NOT NULL THEN
    v_due := coalesce(
      private.payment_due(p_starts_at),
      least(
        now() + make_interval(hours => v_settings.centre_payment_link_hours),
        p_starts_at - interval '1 hour'
      )
    );
    IF v_due <= now() + interval '15 minutes' THEN
      RAISE EXCEPTION 'Too little time left to pay' USING HINT = 'too_soon';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_visit.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  PERFORM set_config('kolor.change_reason', coalesce(left(btrim(p_reason), 500), ''), true);
  BEGIN
    UPDATE public.appointments
    SET during = v_during,
        mode = p_mode,
        room_id = CASE WHEN p_mode = 'in_person' THEN v_room.id END,
        availability_rule_id = NULL,
        buffer_minutes = v_settings.default_visit_buffer_minutes,
        payment_due_at = coalesce(v_due, payment_due_at)
    WHERE id = v_visit.id;
  EXCEPTION WHEN exclusion_violation THEN
    IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
      RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
    END IF;
    RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
  END;
  PERFORM set_config('kolor.change_reason', '', true);

  -- The e-mails about it (and the reminders) go again for the new time.
  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id
    AND kind IN ('rescheduled', 'reminder', 'payment_reminder', 'payment_last_call');

  RETURN QUERY SELECT v_visit.reference, lower(v_during), upper(v_during),
    private.times_moved(v_visit.id), coalesce(v_due, v_visit.payment_due_at);
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_reschedule_visit(uuid, timestamptz, public.visit_mode, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_reschedule_visit(uuid, timestamptz, public.visit_mode, uuid, text) TO authenticated, service_role;

-- A specialist's history hides the money (and the refunds) as before.
CREATE OR REPLACE FUNCTION public.list_visit_events(p_id uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id bigint, occurred_at timestamp with time zone, kind text, actor text, actor_name text, details jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.visible_visits(p_own) AS v WHERE v.id = p_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT event.id, event.occurred_at, event.kind, event.actor,
    nullif(concat_ws(' ', account.first_name, account.last_name), ''),
    CASE WHEN v_admin THEN event.details
      ELSE event.details - 'price_minor' - 'refund_due_minor' - 'amount_minor'
        - 'refunded_minor' - 'refund_minor' END
  FROM public.appointment_events AS event
  LEFT JOIN public.profiles AS account ON account.id = event.actor_user_id
  WHERE event.appointment_id = p_id
    AND (v_admin OR event.kind NOT IN (
      'payment_started', 'payment_succeeded', 'payment_failed',
      'payment_expired', 'refund_recorded', 'refund_issued'))
  ORDER BY event.occurred_at, event.id;
END;
$function$;

-- The e-mail about a move the centre made brings a new link (the client
-- may never have had one); about the client's own, theirs still works.
CREATE OR REPLACE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz,
  service_name text, specialist_name text, room_name text, location_name text,
  location_address text, price_minor integer, currency_code text,
  client_name text, client_email text, manage_token text, cancelled_by text,
  booked_by text, paid boolean, payment_due_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
  v_ready boolean;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND OR v_visit.client_email IS NULL THEN
    RETURN;
  END IF;
  v_ready := CASE p_kind
    WHEN 'cancelled' THEN v_visit.status = 'cancelled'
    WHEN 'reserved' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_reminder' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_last_call' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'reminder' THEN v_visit.status = 'confirmed' AND lower(v_visit.during) > now()
    WHEN 'rescheduled' THEN v_visit.status IN ('confirmed', 'awaiting_payment')
    ELSE v_visit.status = 'confirmed'
  END;
  IF NOT v_ready THEN
    RETURN;
  END IF;

  INSERT INTO public.booking_emails AS email (appointment_id, kind)
  VALUES (v_visit.id, p_kind)
  ON CONFLICT (appointment_id, kind) DO UPDATE
  SET claimed_at = now()
  WHERE email.sent_at IS NULL AND email.claimed_at < now() - interval '10 minutes';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_kind IN ('confirmation', 'reminder', 'reserved', 'payment_reminder', 'payment_last_call')
     OR (p_kind = 'cancelled' AND v_visit.cancelled_by = 'centre')
     OR (p_kind = 'rescheduled' AND (
       SELECT event.actor FROM public.appointment_events AS event
       WHERE event.appointment_id = v_visit.id AND event.kind = 'rescheduled'
       ORDER BY event.id DESC LIMIT 1
     ) = 'centre') THEN
    v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
    UPDATE public.appointments
    SET manage_token_hash = extensions.digest(v_token, 'sha256')
    WHERE id = v_visit.id;
  END IF;

  RETURN QUERY
  SELECT v_visit.reference, v_visit.mode, lower(v_visit.during), upper(v_visit.during),
    service.name, profile.display_name, room.name, location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    v_visit.price_minor, v_visit.currency_code,
    v_visit.client_name, v_visit.client_email, v_token, v_visit.cancelled_by,
    v_visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = v_visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    v_visit.payment_due_at
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$function$;
