-- The specialist hears how the review of their profile went (R13): approved
-- (the changes are on the site now) or sent back with the centre's reason,
-- in their portal's panel and as a toast at once. Not when they review
-- their own (an admin who is also the specialist).

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind IN (
    'booked', 'reserved', 'centre_booked', 'paid',
    'cancelled', 'rescheduled', 'refunded',
    'profile_submitted', 'profile_approved', 'profile_rejected'
  ));

CREATE OR REPLACE FUNCTION private.notify_profile_reviewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF OLD.status <> 'pending_review'
     OR NEW.status NOT IN ('published', 'rejected') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT specialist.user_id, 'specialist', NULL,
    CASE NEW.status WHEN 'published' THEN 'profile_approved' ELSE 'profile_rejected' END,
    'centre',
    jsonb_strip_nulls(jsonb_build_object(
      'specialist_id', NEW.specialist_id,
      'reason', CASE WHEN NEW.status = 'rejected'
        THEN nullif(btrim(NEW.review_comment), '') END
    ))
  FROM public.specialists AS specialist
  WHERE specialist.id = NEW.specialist_id
    AND specialist.user_id IS NOT NULL
    AND specialist.user_id IS DISTINCT FROM NEW.reviewed_by;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION private.notify_profile_reviewed()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER specialist_profile_drafts_notify_reviewed
  AFTER UPDATE OF status ON public.specialist_profile_drafts
  FOR EACH ROW EXECUTE FUNCTION private.notify_profile_reviewed();
