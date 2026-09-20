CREATE TYPE public.service_category AS ENUM (
  'consultation',
  'psychotherapy',
  'couples_therapy',
  'assessment',
  'workshop_related',
  'other'
);

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  category public.service_category NOT NULL DEFAULT 'other',
  default_duration_minutes integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  publicly_visible boolean NOT NULL DEFAULT true,
  booking_enabled boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT services_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT services_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 3 AND 100
  ),
  CONSTRAINT services_short_description_length CHECK (
    short_description IS NULL OR char_length(short_description) <= 500
  ),
  CONSTRAINT services_description_length CHECK (
    description IS NULL OR char_length(description) <= 10000
  ),
  CONSTRAINT services_default_duration_range CHECK (
    default_duration_minutes BETWEEN 15 AND 300
  ),
  CONSTRAINT services_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX services_active_publicly_visible_sort_order_idx
ON public.services (active, publicly_visible, sort_order);

CREATE TABLE public.specialist_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  accepting_new_clients boolean NOT NULL DEFAULT false,
  price_minor integer NOT NULL,
  currency_code text NOT NULL DEFAULT 'PLN',
  duration_minutes integer,
  supports_in_person boolean NOT NULL DEFAULT true,
  supports_online boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_services_specialist_service_key UNIQUE (specialist_id, service_id),
  CONSTRAINT specialist_services_price_range CHECK (
    price_minor BETWEEN 0 AND 10000000
  ),
  CONSTRAINT specialist_services_currency_format CHECK (
    currency_code ~ '^[A-Z]{3}$'
  ),
  CONSTRAINT specialist_services_duration_range CHECK (
    duration_minutes IS NULL OR duration_minutes BETWEEN 15 AND 300
  ),
  CONSTRAINT specialist_services_modality_required CHECK (
    NOT active OR supports_in_person OR supports_online
  )
);

CREATE INDEX specialist_services_service_id_active_idx
ON public.specialist_services (service_id, active);

CREATE TRIGGER set_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_specialist_services_updated_at
BEFORE UPDATE ON public.specialist_services
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_services FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.services FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.specialist_services FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TYPE public.service_category FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.service_category TO authenticated, service_role;

GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO service_role;

GRANT SELECT ON public.specialist_services TO anon;
GRANT SELECT, INSERT, UPDATE ON public.specialist_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialist_services TO service_role;

CREATE FUNCTION private.service_is_public(target_service_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.services
    WHERE id = target_service_id
      AND active
      AND publicly_visible
  );
$$;

REVOKE ALL ON FUNCTION private.service_is_public(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.service_is_public(uuid) TO anon, authenticated;

CREATE POLICY "Authenticated users can read permitted services"
ON public.services
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR (public.has_role('specialist'::public.app_role) AND active)
);

CREATE POLICY "Public can read active public services"
ON public.services
FOR SELECT
TO anon
USING (active AND publicly_visible);

CREATE POLICY "Admins can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Authenticated users can read permitted specialist services"
ON public.specialist_services
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_services.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Public can read effective public specialist services"
ON public.specialist_services
FOR SELECT
TO anon
USING (
  active
  AND private.service_is_public(service_id)
  AND private.specialist_is_active(specialist_id)
);

CREATE POLICY "Authenticated users can insert permitted specialist services"
ON public.specialist_services
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role('admin'::public.app_role)
  OR (
    public.has_role('specialist'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.specialists
      WHERE specialists.id = specialist_services.specialist_id
        AND specialists.user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "Authenticated users can update permitted specialist services"
ON public.specialist_services
FOR UPDATE
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_services.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_services.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);
