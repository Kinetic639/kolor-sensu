-- A visit's side panel (get_visit) reads private.visible_visits, which
-- gained the client's id (20261005190000): its result names the column
-- too, or the panel could not open the visit.
DROP FUNCTION public.get_visit(uuid, boolean);

CREATE FUNCTION public.get_visit(p_id uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_id uuid, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone, payment_due_at timestamp with time zone, emails jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  RETURN QUERY
  SELECT v.*,
    CASE WHEN v_admin THEN coalesce((
      SELECT jsonb_agg(jsonb_build_object('kind', email.kind, 'sent_at', email.sent_at)
        ORDER BY email.claimed_at)
      FROM public.booking_emails AS email
      WHERE email.appointment_id = v.id AND email.sent_at IS NOT NULL
    ), '[]'::jsonb) END
  FROM private.visible_visits(p_own) AS v
  WHERE v.id = p_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_visit(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit(uuid, boolean) TO authenticated, service_role;
