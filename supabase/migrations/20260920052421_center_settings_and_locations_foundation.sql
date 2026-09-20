CREATE TABLE public.center_settings (
  id integer PRIMARY KEY DEFAULT 1,
  business_name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Europe/Warsaw',
  default_locale text NOT NULL DEFAULT 'pl-PL',
  default_currency text NOT NULL DEFAULT 'PLN',
  booking_enabled boolean NOT NULL DEFAULT false,
  default_visit_buffer_minutes integer NOT NULL DEFAULT 15,
  min_booking_lead_minutes integer NOT NULL DEFAULT 60,
  max_booking_horizon_days integer NOT NULL DEFAULT 60,
  cancellation_window_hours integer NOT NULL DEFAULT 24,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT center_settings_singleton CHECK (id = 1),
  CONSTRAINT center_settings_business_name_length CHECK (
    char_length(business_name) BETWEEN 1 AND 200
  ),
  CONSTRAINT center_settings_timezone_length CHECK (
    char_length(timezone) BETWEEN 1 AND 100
  ),
  CONSTRAINT center_settings_locale_format CHECK (
    default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'
  ),
  CONSTRAINT center_settings_currency_format CHECK (
    default_currency ~ '^[A-Z]{3}$'
  ),
  CONSTRAINT center_settings_buffer_range CHECK (
    default_visit_buffer_minutes BETWEEN 0 AND 240
  ),
  CONSTRAINT center_settings_lead_range CHECK (
    min_booking_lead_minutes BETWEEN 0 AND 10080
  ),
  CONSTRAINT center_settings_horizon_range CHECK (
    max_booking_horizon_days BETWEEN 1 AND 730
  ),
  CONSTRAINT center_settings_cancellation_range CHECK (
    cancellation_window_hours BETWEEN 0 AND 720
  ),
  CONSTRAINT center_settings_phone_length CHECK (
    phone IS NULL OR char_length(phone) <= 40
  ),
  CONSTRAINT center_settings_email_format CHECK (
    email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  )
);

CREATE TABLE public.center_public_profile (
  id integer PRIMARY KEY DEFAULT 1,
  display_name text NOT NULL,
  short_description text,
  logo_path text,
  public_email text,
  public_phone text,
  website_url text,
  instagram_url text,
  facebook_url text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT center_public_profile_singleton CHECK (id = 1),
  CONSTRAINT center_public_profile_display_name_length CHECK (
    char_length(display_name) BETWEEN 1 AND 200
  ),
  CONSTRAINT center_public_profile_short_description_length CHECK (
    short_description IS NULL OR char_length(short_description) <= 500
  ),
  CONSTRAINT center_public_profile_logo_path_length CHECK (
    logo_path IS NULL OR char_length(logo_path) <= 2048
  ),
  CONSTRAINT center_public_profile_email_format CHECK (
    public_email IS NULL OR public_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  CONSTRAINT center_public_profile_phone_length CHECK (
    public_phone IS NULL OR char_length(public_phone) <= 40
  ),
  CONSTRAINT center_public_profile_url_lengths CHECK (
    (website_url IS NULL OR char_length(website_url) <= 2048)
    AND (instagram_url IS NULL OR char_length(instagram_url) <= 2048)
    AND (facebook_url IS NULL OR char_length(facebook_url) <= 2048)
  )
);

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country_code text NOT NULL DEFAULT 'PL',
  active boolean NOT NULL DEFAULT true,
  publicly_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT locations_name_length CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT locations_slug_format CHECK (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND char_length(slug) BETWEEN 3 AND 100
  ),
  CONSTRAINT locations_country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT locations_address_lengths CHECK (
    (address_line1 IS NULL OR char_length(address_line1) <= 200)
    AND (address_line2 IS NULL OR char_length(address_line2) <= 200)
    AND (postal_code IS NULL OR char_length(postal_code) <= 20)
    AND (city IS NULL OR char_length(city) <= 100)
  ),
  CONSTRAINT locations_sort_order_range CHECK (sort_order BETWEEN 0 AND 10000)
);

CREATE INDEX locations_active_sort_order_idx ON public.locations (active, sort_order);

CREATE TRIGGER set_center_settings_updated_at
BEFORE UPDATE ON public.center_settings
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_center_public_profile_updated_at
BEFORE UPDATE ON public.center_public_profile
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER set_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.center_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.center_public_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.center_public_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.center_settings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.center_public_profile FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.locations FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON public.center_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_settings TO service_role;

GRANT SELECT ON public.center_public_profile TO anon;
GRANT SELECT, UPDATE ON public.center_public_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.center_public_profile TO service_role;

GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE ON public.locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO service_role;

CREATE POLICY "Admins can read center settings"
ON public.center_settings
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update center settings"
ON public.center_settings
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Portal roles can read center public profile"
ON public.center_public_profile
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR public.has_role('specialist'::public.app_role)
);

CREATE POLICY "Public can read published center public profile"
ON public.center_public_profile
FOR SELECT
TO anon
USING (published);

CREATE POLICY "Admins can update center public profile"
ON public.center_public_profile
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can read all locations"
ON public.locations
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Specialists can read active locations"
ON public.locations
FOR SELECT
TO authenticated
USING (public.has_role('specialist'::public.app_role) AND active);

CREATE POLICY "Public can read active public locations"
ON public.locations
FOR SELECT
TO anon
USING (active AND publicly_visible);

CREATE POLICY "Admins can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update locations"
ON public.locations
FOR UPDATE
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

INSERT INTO public.center_settings (id, business_name)
VALUES (1, 'Kolor Sensu');

INSERT INTO public.center_public_profile (id, display_name, published)
VALUES (1, 'Kolor Sensu', false);
