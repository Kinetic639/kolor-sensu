-- The offer's catalogues: named groups of services, as the site's menu
-- shows them (a catalogue opens to its services). A service is in one
-- catalogue or none. The offer's order is one list of the services
-- outside a catalogue and the catalogues (both by `sort_order`), and each
-- catalogue's own services by theirs. Anyone may read the names (the menu
-- shows only those with a public service); admins arrange.

CREATE TABLE public.service_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_catalogs_name_length CHECK (
    char_length(btrim(name)) BETWEEN 1 AND 120
  ),
  CONSTRAINT service_catalogs_sort_order_range CHECK (
    sort_order BETWEEN 0 AND 10000
  )
);

CREATE TRIGGER set_service_catalogs_updated_at
BEFORE UPDATE ON public.service_catalogs
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.services
ADD COLUMN catalog_id uuid
REFERENCES public.service_catalogs (id) ON DELETE SET NULL;

CREATE INDEX services_catalog_id_idx ON public.services (catalog_id);

ALTER TABLE public.service_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalogs FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_catalogs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.service_catalogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalogs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalogs TO service_role;

CREATE POLICY "Anyone can read service catalogs"
ON public.service_catalogs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can insert service catalogs"
ON public.service_catalogs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update service catalogs"
ON public.service_catalogs
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete service catalogs"
ON public.service_catalogs
FOR DELETE
TO authenticated
USING (public.has_role('admin'::public.app_role));

-- The whole arrangement at once (the admin's editor saves it in one go):
-- each catalogue's place, and each service's catalogue and place. Admins
-- only; anything not named keeps what it had.
CREATE FUNCTION public.arrange_services(p_catalogs jsonb, p_services jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins arrange the offer'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.service_catalogs AS catalog
  SET sort_order = item.sort_order
  FROM jsonb_to_recordset(p_catalogs) AS item(id uuid, sort_order integer)
  WHERE catalog.id = item.id;

  UPDATE public.services AS service
  SET catalog_id = item.catalog_id,
      sort_order = item.sort_order
  FROM jsonb_to_recordset(p_services)
    AS item(id uuid, catalog_id uuid, sort_order integer)
  WHERE service.id = item.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.arrange_services(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arrange_services(jsonb, jsonb) TO authenticated;
