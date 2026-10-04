-- Ustawienia → Dostęp: who may use the admin's portal. The admins see
-- every portal user (admins and specialists, their e-mail and last sign
-- in), give a specialist the admin's access or take it back; a new admin
-- is invited from the site (apps/web holds the service key and the
-- e-mails). Nobody takes their own access, and the last admin stays.

CREATE FUNCTION public.list_portal_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  is_admin boolean,
  is_specialist boolean,
  signed_in_at timestamptz,
  invited_at timestamptz,
  joined boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT account.id, account.email::text, profile.first_name, profile.last_name,
    EXISTS (
      SELECT 1 FROM public.user_roles AS role
      WHERE role.user_id = account.id AND role.role = 'admin'
    ),
    EXISTS (
      SELECT 1 FROM public.user_roles AS role
      WHERE role.user_id = account.id AND role.role = 'specialist'
    ),
    account.last_sign_in_at,
    account.invited_at,
    account.last_sign_in_at IS NOT NULL
  FROM auth.users AS account
  JOIN public.profiles AS profile ON profile.id = account.id
  WHERE public.has_role('admin')
    AND EXISTS (SELECT 1 FROM public.user_roles AS role WHERE role.user_id = account.id)
  ORDER BY profile.last_name, profile.first_name, account.email;
$$;

REVOKE ALL ON FUNCTION public.list_portal_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_portal_users() TO authenticated;

CREATE FUNCTION public.grant_admin(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user) THEN
    RAISE EXCEPTION 'No such user.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user, 'admin')
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_admin(uuid) TO authenticated;

CREATE FUNCTION public.revoke_admin(p_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'You cannot take your own access.'
      USING ERRCODE = 'P0001', HINT = 'own_access';
  END IF;
  -- The last admin stays (locked so two cannot take each other's at once).
  PERFORM 1 FROM public.user_roles WHERE role = 'admin' FOR UPDATE;
  IF (SELECT count(*) FROM public.user_roles WHERE role = 'admin' AND user_id <> p_user) = 0 THEN
    RAISE EXCEPTION 'The centre needs an admin.'
      USING ERRCODE = 'P0001', HINT = 'last_admin';
  END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user AND role = 'admin';
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin(uuid) TO authenticated;

-- The invitation (apps/web, with the service key): is the address already
-- someone's account?
CREATE FUNCTION public.portal_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.portal_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_user_id_by_email(text) TO service_role;
