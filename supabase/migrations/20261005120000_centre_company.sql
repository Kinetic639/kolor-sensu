-- Ustawienia → Centrum. The settings' form updates the public profile's
-- row 1, so it must be there (made, unpublished, where it is missing).
INSERT INTO public.center_public_profile (id, display_name, published)
VALUES (1, 'Kolor Sensu', false)
ON CONFLICT (id) DO NOTHING;

-- The centre's company, as the law wants it on the site (the footer) and
-- on what the centre sends: its legal name, NIP, REGON and registered
-- address. Digits only (the forms check the check digits).
ALTER TABLE public.center_settings
  ADD COLUMN legal_name text,
  ADD COLUMN tax_id text,
  ADD COLUMN regon text,
  ADD COLUMN registered_address text,
  ADD CONSTRAINT center_settings_legal_name_length
    CHECK (legal_name IS NULL OR char_length(legal_name) BETWEEN 1 AND 200),
  ADD CONSTRAINT center_settings_tax_id_format
    CHECK (tax_id IS NULL OR tax_id ~ '^[0-9]{10}$'),
  ADD CONSTRAINT center_settings_regon_format
    CHECK (regon IS NULL OR regon ~ '^([0-9]{9}|[0-9]{14})$'),
  ADD CONSTRAINT center_settings_registered_address_length
    CHECK (
      registered_address IS NULL
      OR char_length(registered_address) BETWEEN 1 AND 300
    );

-- The company for the site (anyone may read it: it is public by law).
CREATE FUNCTION public.company_details()
RETURNS TABLE (
  legal_name text,
  tax_id text,
  regon text,
  registered_address text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT settings.legal_name, settings.tax_id, settings.regon,
    settings.registered_address
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$$;

REVOKE ALL ON FUNCTION public.company_details() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_details()
  TO anon, authenticated, service_role;
