-- A visit's discount code in the portals (docs/product/vouchers-plan.md,
-- PR 2): the code, the list price and the discount, for whoever may see
-- the visit (private.visible_visits: the admin every visit, a specialist
-- their own). Its own function, so get_visit's columns stay as they are.

CREATE OR REPLACE FUNCTION public.get_visit_discount(p_id uuid, p_own boolean DEFAULT false)
RETURNS TABLE (code text, list_price_minor integer, discount_minor integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT dc.code, visit.list_price_minor, visit.discount_minor
  FROM private.visible_visits(p_own) AS seen
  JOIN public.appointments AS visit ON visit.id = seen.id
  JOIN public.discount_codes AS dc ON dc.id = visit.discount_code_id
  WHERE seen.id = p_id;
$$;

REVOKE ALL ON FUNCTION public.get_visit_discount(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visit_discount(uuid, boolean) TO authenticated;
