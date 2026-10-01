-- Notifications and live updates in the portals (docs/product/booking-plan.md,
-- R13). What happens to a visit (its history, appointment_events) becomes a
-- notification for whoever should know: every admin (with the money) and the
-- visit's specialist (without it), never the person who did it. Each person
-- has their own inbox per portal, read or not.
--
-- The portals also hear of it at once: the database sends a short signal on
-- the person's own private Realtime channel, `user:<id>` ("a notification",
-- "visits changed"), and the page reloads its data from the server. The
-- signal carries no more than the person may already read.

CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  portal text NOT NULL CHECK (portal IN ('admin', 'specialist')),
  appointment_id uuid REFERENCES public.appointments (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'booked', 'reserved', 'centre_booked', 'paid',
    'cancelled', 'rescheduled', 'refunded'
  )),
  actor text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX notifications_inbox_idx
  ON public.notifications (user_id, portal, created_at DESC);
CREATE INDEX notifications_appointment_id_idx
  ON public.notifications (appointment_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications FROM anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;

CREATE POLICY "Read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- What happened to a visit, for whom: from its history.
CREATE FUNCTION private.notify_visit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_kind text;
  v_visit public.appointments%ROWTYPE;
  v_about jsonb;
  v_money jsonb;
BEGIN
  SELECT * INTO v_visit FROM public.appointments WHERE id = NEW.appointment_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_kind := CASE
    -- Paid: a reservation (the client's or the centre's), or a new visit.
    WHEN NEW.kind = 'confirmed' AND (
      v_visit.booked_by = 'centre' OR EXISTS (
        SELECT 1 FROM public.appointment_events AS event
        WHERE event.appointment_id = v_visit.id AND event.kind = 'reserved'
      )
    ) THEN 'paid'
    WHEN NEW.kind = 'confirmed' THEN 'booked'
    WHEN NEW.kind = 'reserved' THEN 'reserved'
    WHEN NEW.kind = 'created' AND NEW.actor = 'centre' THEN 'centre_booked'
    WHEN NEW.kind = 'cancelled' THEN 'cancelled'
    WHEN NEW.kind = 'rescheduled' THEN 'rescheduled'
    WHEN NEW.kind = 'refund_issued' THEN 'refunded'
  END;
  IF v_kind IS NULL THEN
    RETURN NULL;
  END IF;

  v_about := jsonb_strip_nulls(jsonb_build_object(
    'reference', v_visit.reference,
    'starts_at', lower(v_visit.during),
    'mode', v_visit.mode,
    'client_name', v_visit.client_name,
    'service_name', (SELECT service.name FROM public.services AS service
                     WHERE service.id = v_visit.service_id),
    'specialist_name', (SELECT profile.display_name
                        FROM public.specialist_public_profiles AS profile
                        WHERE profile.specialist_id = v_visit.specialist_id),
    'from_starts_at', NEW.details -> 'from_starts_at',
    'reason', NEW.details -> 'reason'
  ));
  v_money := jsonb_strip_nulls(jsonb_build_object(
    'refund_minor', NEW.details -> 'refund_minor',
    'refund_due_minor', NEW.details -> 'refund_due_minor',
    'price_minor', v_visit.price_minor,
    'currency_code', v_visit.currency_code
  ));

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', v_visit.id, v_kind, NEW.actor, v_about || v_money
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  WHERE admin.user_id IS DISTINCT FROM NEW.actor_user_id;

  -- The specialist: their visits, without the money.
  IF v_kind <> 'refunded' THEN
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT specialist.user_id, 'specialist', v_visit.id, v_kind, NEW.actor, v_about
    FROM public.specialists AS specialist
    WHERE specialist.id = v_visit.specialist_id
      AND specialist.user_id IS NOT NULL
      AND specialist.user_id IS DISTINCT FROM NEW.actor_user_id;
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION private.notify_visit_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointment_events_notify
AFTER INSERT ON public.appointment_events
FOR EACH ROW EXECUTE FUNCTION private.notify_visit_event();

-- A new notification: a signal on its owner's channel.
CREATE FUNCTION private.broadcast_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object(
      'id', NEW.id, 'portal', NEW.portal, 'kind', NEW.kind, 'actor', NEW.actor,
      'appointment_id', NEW.appointment_id, 'details', NEW.details,
      'created_at', NEW.created_at
    ),
    'notification',
    'user:' || NEW.user_id::text,
    true
  );
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION private.broadcast_notification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notifications_broadcast
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION private.broadcast_notification();

-- A visit the portals show changed: "visits changed" to every admin and to
-- the visit's specialist (holds and their lapsing are not shown, so not
-- told; nor a new link token for an e-mail).
CREATE FUNCTION private.broadcast_visit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT (
    NEW.status IN ('awaiting_payment', 'confirmed', 'cancelled')
    OR (TG_OP = 'UPDATE' AND OLD.status IN ('awaiting_payment', 'confirmed', 'cancelled'))
  ) THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.status, NEW.during, NEW.mode, NEW.room_id, NEW.payment_due_at,
    NEW.refund_due_minor, NEW.client_name, NEW.client_email, NEW.client_phone,
    NEW.client_notes
  ) IS NOT DISTINCT FROM (
    OLD.status, OLD.during, OLD.mode, OLD.room_id, OLD.payment_due_at,
    OLD.refund_due_minor, OLD.client_name, OLD.client_email, OLD.client_phone,
    OLD.client_notes
  ) THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('appointment_id', NEW.id),
    'visits',
    'user:' || recipient.user_id::text,
    true
  )
  FROM (
    SELECT role.user_id FROM public.user_roles AS role WHERE role.role = 'admin'
    UNION
    SELECT specialist.user_id FROM public.specialists AS specialist
    WHERE specialist.id = NEW.specialist_id AND specialist.user_id IS NOT NULL
  ) AS recipient;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION private.broadcast_visit_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_broadcast
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.broadcast_visit_change();

-- A payment confirmed or refunded: the admins' views show it.
CREATE FUNCTION private.broadcast_payment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM realtime.send(
    jsonb_build_object('appointment_id', NEW.appointment_id),
    'visits',
    'user:' || admin.user_id::text,
    true
  )
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION private.broadcast_payment_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER payments_broadcast
AFTER UPDATE OF status, refunded_minor ON public.payments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.refunded_minor IS DISTINCT FROM NEW.refunded_minor)
EXECUTE FUNCTION private.broadcast_payment_change();

-- Only one's own channel can be heard; nobody can send on it.
CREATE POLICY "Hear own channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.messages.extension = 'broadcast'
  AND (SELECT realtime.topic()) = 'user:' || (SELECT auth.uid())::text
);

-- Opening the inbox reads it.
CREATE FUNCTION public.mark_notifications_read(p_portal text)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE user_id = (SELECT auth.uid())
      AND portal = p_portal
      AND read_at IS NULL
    RETURNING 1
  )
  SELECT count(*)::integer FROM done;
$function$;
REVOKE ALL ON FUNCTION public.mark_notifications_read(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(text) TO authenticated;
