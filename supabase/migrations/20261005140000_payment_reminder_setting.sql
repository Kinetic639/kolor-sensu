-- Ustawienia → Rezerwacje online: when the reminder to pay a reservation
-- goes out (so many hours before the payment is due), or none (NULL). It
-- was a day, fixed. The last call, six hours before, stays as it is, so
-- the reminder is set further out than that.
ALTER TABLE public.center_settings
  ADD COLUMN payment_reminder_hours integer DEFAULT 24,
  ADD CONSTRAINT center_settings_payment_reminder_hours_range
    CHECK (payment_reminder_hours IS NULL OR payment_reminder_hours BETWEEN 7 AND 168);

CREATE OR REPLACE FUNCTION public.list_due_emails()
RETURNS TABLE(reference text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH settings AS (
    SELECT visit_reminder_hours, payment_reminder_hours
    FROM public.center_settings
    WHERE id = 1
  ),
  due AS (
    -- Cancelled for want of payment, lately.
    SELECT visit.id, visit.reference, 'cancelled' AS kind
    FROM public.appointments AS visit
    WHERE visit.status = 'cancelled' AND visit.cancelled_by = 'system'
      AND visit.cancelled_at > now() - interval '7 days'
      AND visit.client_email IS NOT NULL
    UNION ALL
    -- The set time before the payment is due (for reservations made
    -- before that); none when the centre has switched it off.
    SELECT visit.id, visit.reference, 'payment_reminder'
    FROM public.appointments AS visit
    CROSS JOIN settings
    WHERE settings.payment_reminder_hours IS NOT NULL
      AND visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now() + interval '6 hours'
      AND visit.payment_due_at
        <= now() + make_interval(hours => settings.payment_reminder_hours)
      AND visit.created_at
        < visit.payment_due_at - make_interval(hours => settings.payment_reminder_hours)
    UNION ALL
    -- The last call, six hours before.
    SELECT visit.id, visit.reference, 'payment_last_call'
    FROM public.appointments AS visit
    WHERE visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now()
      AND visit.payment_due_at <= now() + interval '6 hours'
      AND visit.created_at < visit.payment_due_at - interval '6 hours'
    UNION ALL
    -- The set time before a paid visit (for visits booked before that);
    -- none when the centre has switched reminders off.
    SELECT visit.id, visit.reference, 'reminder'
    FROM public.appointments AS visit
    CROSS JOIN settings
    WHERE settings.visit_reminder_hours IS NOT NULL
      AND visit.status = 'confirmed'
      AND lower(visit.during) > now()
      AND lower(visit.during)
        <= now() + make_interval(hours => settings.visit_reminder_hours)
      AND visit.created_at
        < lower(visit.during) - make_interval(hours => settings.visit_reminder_hours)
  )
  SELECT due.reference, due.kind FROM due
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = due.id AND email.kind = due.kind
      AND (email.sent_at IS NOT NULL OR email.claimed_at > now() - interval '10 minutes')
  );
$function$;
