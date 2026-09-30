-- A reservation's full history (the audit log): everything that happened
-- to it from the hold on, written by triggers on the visit, its payments
-- and its e-mails, so no path can change a visit without a trace. Who did
-- it: the client (the wizard, the e-mail link), the centre (the admin
-- portal), the payment (Stripe) or the system (expiry, e-mails). Entries
-- are never changed or removed. Read through list_visit_events, with the
-- same rules as the visits (specialists: their own, without the money).

CREATE TABLE public.appointment_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL CHECK (kind IN (
    'created', 'details_saved', 'hold_released', 'hold_expired',
    'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
    'payment_started', 'payment_succeeded', 'payment_failed',
    'payment_expired', 'refund_recorded', 'email_sent'
  )),
  actor text NOT NULL CHECK (actor IN ('client', 'centre', 'payment', 'system')),
  -- The signed-in person behind it (an admin), if any.
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX appointment_events_appointment_idx
  ON public.appointment_events (appointment_id, occurred_at, id);

ALTER TABLE public.appointment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.appointment_events TO service_role;

CREATE FUNCTION private.log_appointment_event(
  p_appointment_id uuid,
  p_kind text,
  p_actor text,
  p_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  INSERT INTO public.appointment_events (appointment_id, kind, actor, actor_user_id, details)
  VALUES (p_appointment_id, p_kind, p_actor, (SELECT auth.uid()), p_details);
$function$;

REVOKE ALL ON FUNCTION private.log_appointment_event(uuid, text, text, jsonb)
FROM PUBLIC, anon, authenticated;

-- The visit: its hold, the client's details, its status and its time.
CREATE FUNCTION private.appointment_events_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.id, 'created', 'client', jsonb_build_object(
      'reference', NEW.reference,
      'starts_at', lower(NEW.during), 'ends_at', upper(NEW.during),
      'mode', NEW.mode, 'price_minor', NEW.price_minor, 'currency_code', NEW.currency_code
    ));
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
        CASE WHEN NEW.cancelled_by = 'centre' THEN 'centre' ELSE 'client' END,
        jsonb_build_object('from', OLD.status, 'refund_due_minor', NEW.refund_due_minor));
    ELSIF NEW.status = 'awaiting_payment' THEN
      PERFORM private.log_appointment_event(NEW.id, 'awaiting_payment', 'payment');
    ELSIF NEW.status = 'confirmed' THEN
      PERFORM private.log_appointment_event(NEW.id, 'confirmed', 'payment',
        jsonb_build_object('from', OLD.status));
    END IF;
  END IF;

  IF NEW.during IS DISTINCT FROM OLD.during AND OLD.status = NEW.status
     AND NEW.status IN ('confirmed', 'awaiting_payment') THEN
    PERFORM private.log_appointment_event(NEW.id, 'rescheduled',
      CASE WHEN NEW.reschedule_count > OLD.reschedule_count THEN 'client' ELSE 'centre' END,
      jsonb_build_object(
        'from_starts_at', lower(OLD.during), 'from_ends_at', upper(OLD.during),
        'to_starts_at', lower(NEW.during), 'to_ends_at', upper(NEW.during)
      ));
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.appointment_events_trigger() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_log_events
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.appointment_events_trigger();

-- Its payments: started, paid, failed, lapsed, refunded.
CREATE FUNCTION private.payment_events_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_started', 'payment',
      jsonb_build_object('amount_minor', NEW.amount_minor, 'currency_code', NEW.currency_code));
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'succeeded' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_succeeded', 'payment',
        jsonb_build_object('amount_minor', NEW.amount_minor, 'currency_code', NEW.currency_code));
    ELSIF NEW.status = 'failed' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_failed', 'payment');
    ELSIF NEW.status = 'expired' THEN
      PERFORM private.log_appointment_event(NEW.appointment_id, 'payment_expired', 'payment');
    END IF;
  END IF;
  IF NEW.refunded_minor > OLD.refunded_minor THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'refund_recorded', 'payment',
      jsonb_build_object('refunded_minor', NEW.refunded_minor, 'currency_code', NEW.currency_code));
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.payment_events_trigger() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER payments_log_events
AFTER INSERT OR UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION private.payment_events_trigger();

-- Its e-mails, once sent.
CREATE FUNCTION private.email_events_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.sent_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.sent_at IS NULL) THEN
    PERFORM private.log_appointment_event(NEW.appointment_id, 'email_sent', 'system',
      jsonb_build_object('email', NEW.kind));
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.email_events_trigger() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER booking_emails_log_events
AFTER INSERT OR UPDATE ON public.booking_emails
FOR EACH ROW EXECUTE FUNCTION private.email_events_trigger();

-- The history of visits booked before the log: what their columns tell.
INSERT INTO public.appointment_events (appointment_id, occurred_at, kind, actor, details)
SELECT visit.id, visit.created_at, 'created', 'client',
  jsonb_build_object('reference', visit.reference,
    'starts_at', lower(visit.during), 'ends_at', upper(visit.during),
    'mode', visit.mode, 'price_minor', visit.price_minor,
    'currency_code', visit.currency_code, 'restored', true)
FROM public.appointments AS visit
UNION ALL
SELECT visit.id, visit.confirmed_at, 'confirmed', 'payment', '{"restored": true}'::jsonb
FROM public.appointments AS visit WHERE visit.confirmed_at IS NOT NULL
UNION ALL
SELECT visit.id, visit.cancelled_at,
  CASE WHEN visit.confirmed_at IS NULL AND visit.cancelled_by = 'client' THEN 'hold_released' ELSE 'cancelled' END,
  CASE WHEN visit.cancelled_by = 'centre' THEN 'centre' ELSE 'client' END,
  jsonb_build_object('refund_due_minor', visit.refund_due_minor, 'restored', true)
FROM public.appointments AS visit WHERE visit.cancelled_at IS NOT NULL
UNION ALL
SELECT payment.appointment_id, payment.created_at, 'payment_started', 'payment',
  jsonb_build_object('amount_minor', payment.amount_minor,
    'currency_code', payment.currency_code, 'restored', true)
FROM public.payments AS payment
UNION ALL
SELECT payment.appointment_id, payment.updated_at, 'refund_recorded', 'payment',
  jsonb_build_object('refunded_minor', payment.refunded_minor,
    'currency_code', payment.currency_code, 'restored', true)
FROM public.payments AS payment WHERE payment.refunded_minor > 0
UNION ALL
SELECT email.appointment_id, email.sent_at, 'email_sent', 'system',
  jsonb_build_object('email', email.kind, 'restored', true)
FROM public.booking_emails AS email WHERE email.sent_at IS NOT NULL;

-- A visit's history, oldest first, for whoever may see the visit; the
-- money only for admins.
CREATE FUNCTION public.list_visit_events(p_id uuid, p_own boolean DEFAULT false)
RETURNS TABLE(
  id bigint,
  occurred_at timestamptz,
  kind text,
  actor text,
  actor_name text,
  details jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
      ELSE event.details - 'price_minor' - 'refund_due_minor' - 'amount_minor' - 'refunded_minor' END
  FROM public.appointment_events AS event
  LEFT JOIN public.profiles AS account ON account.id = event.actor_user_id
  WHERE event.appointment_id = p_id
    AND (v_admin OR event.kind NOT IN (
      'payment_started', 'payment_succeeded', 'payment_failed',
      'payment_expired', 'refund_recorded'))
  ORDER BY event.occurred_at, event.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_visit_events(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visit_events(uuid, boolean) TO authenticated, service_role;
