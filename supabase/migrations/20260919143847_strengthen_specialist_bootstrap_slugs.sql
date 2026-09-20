CREATE OR REPLACE FUNCTION private.handle_specialist_role_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  created_specialist_id uuid;
BEGIN
  IF NEW.role <> 'specialist' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.specialists (user_id, public_slug)
  VALUES (
    NEW.user_id,
    'specialist-' || replace(NEW.user_id::text, '-', '')
  )
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO created_specialist_id;

  IF created_specialist_id IS NULL THEN
    SELECT id INTO created_specialist_id
    FROM public.specialists
    WHERE user_id = NEW.user_id;
  END IF;

  INSERT INTO public.specialist_public_profiles (specialist_id, display_name)
  SELECT
    created_specialist_id,
    trim(concat_ws(' ', profile.first_name, profile.last_name))
  FROM public.profiles AS profile
  WHERE profile.id = NEW.user_id
  ON CONFLICT (specialist_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_specialist_role_insert() FROM PUBLIC, anon, authenticated;
