-- A notification back to unread (R13): the panel's envelope works both
-- ways. Only the person's own; true when it was read.
CREATE FUNCTION public.mark_notification_unread(p_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = NULL
    WHERE id = p_id
      AND user_id = (SELECT auth.uid())
      AND read_at IS NOT NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM done);
$function$;
REVOKE ALL ON FUNCTION public.mark_notification_unread(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_unread(bigint) TO authenticated;
