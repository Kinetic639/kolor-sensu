CREATE TYPE public.app_role AS ENUM ('admin', 'specialist');

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  avatar_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_first_name_length CHECK (char_length(first_name) <= 100),
  CONSTRAINT profiles_last_name_length CHECK (char_length(last_name) <= 100),
  CONSTRAINT profiles_avatar_url_length CHECK (
    avatar_url IS NULL OR char_length(avatar_url) <= 2048
  )
);

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TYPE public.app_role FROM PUBLIC, anon;

GRANT USAGE ON TYPE public.app_role TO authenticated, service_role;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO service_role;

CREATE FUNCTION public.has_role(required_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role = required_role
    );
$$;

REVOKE ALL ON FUNCTION public.has_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(public.app_role) TO authenticated;

CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Admins can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Users can read their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE FUNCTION private.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER create_profile_after_auth_user_insert
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION private.handle_new_auth_user();

INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
SELECT
  id,
  COALESCE(raw_user_meta_data ->> 'first_name', ''),
  COALESCE(raw_user_meta_data ->> 'last_name', ''),
  NULLIF(raw_user_meta_data ->> 'avatar_url', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
