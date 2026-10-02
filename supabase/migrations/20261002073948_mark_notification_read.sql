-- One notification marked read (its button in the bell's inbox, or opened),
-- R13. Only the person's own; true when it was unread.
CREATE FUNCTION public.mark_notification_read(p_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH done AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE id = p_id
      AND user_id = (SELECT auth.uid())
      AND read_at IS NULL
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM done);
$function$;
REVOKE ALL ON FUNCTION public.mark_notification_read(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(bigint) TO authenticated;
