-- A profile sent for review (or reviewed, or withdrawn) shows at once
-- (R13, R14): the admins' dashboard lists it under what needs doing, and
-- the specialist's portal shows how the review went. The portals reload
-- their data on the same signal as for visits ("visits": the page's data
-- changed); only a change of the draft's state counts, not each edit.

CREATE OR REPLACE FUNCTION private.broadcast_profile_draft_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_draft public.specialist_profile_drafts%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_draft := OLD;
  ELSE
    v_draft := NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NULL;
  END IF;

  PERFORM realtime.send(
    jsonb_build_object('draft_id', v_draft.id),
    'visits',
    'user:' || recipient.user_id::text,
    true
  )
  FROM (
    SELECT role.user_id FROM public.user_roles AS role WHERE role.role = 'admin'
    UNION
    SELECT specialist.user_id FROM public.specialists AS specialist
    WHERE specialist.id = v_draft.specialist_id AND specialist.user_id IS NOT NULL
  ) AS recipient;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION private.broadcast_profile_draft_change() FROM PUBLIC;

CREATE TRIGGER specialist_profile_drafts_broadcast
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.specialist_profile_drafts
  FOR EACH ROW EXECUTE FUNCTION private.broadcast_profile_draft_change();
