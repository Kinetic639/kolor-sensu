-- A profile sent for review is a notification for every admin (R13, R14):
-- in the panel and as a toast at once (the notifications' own signal), as
-- well as under what needs doing on the dashboard. It names the specialist
-- and leads to their profile; it has no visit.

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
    'booked', 'reserved', 'centre_booked', 'paid',
    'cancelled', 'rescheduled', 'refunded',
    'profile_submitted'
  ));

CREATE OR REPLACE FUNCTION private.notify_profile_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Only when it comes to wait for review (sent, or sent again).
  IF NEW.status <> 'pending_review'
     OR (TG_OP = 'UPDATE' AND OLD.status = 'pending_review') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', NULL, 'profile_submitted', 'specialist',
    jsonb_build_object(
      'specialist_id', NEW.specialist_id,
      'specialist_name', coalesce(
        nullif(btrim(NEW.display_name), ''),
        nullif(btrim(concat_ws(' ', NEW.first_name, NEW.last_name)), ''),
        'Specjalista'
      )
    )
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  -- Never the person who sent it.
  WHERE admin.user_id IS DISTINCT FROM NEW.submitted_by;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_profile_submitted()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER specialist_profile_drafts_notify
  AFTER INSERT OR UPDATE OF status ON public.specialist_profile_drafts
  FOR EACH ROW EXECUTE FUNCTION private.notify_profile_submitted();
