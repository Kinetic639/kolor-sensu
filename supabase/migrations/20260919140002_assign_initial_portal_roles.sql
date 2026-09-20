DO $$
DECLARE
  michal_user_id uuid;
  lovable_user_id uuid;
BEGIN
  SELECT id
  INTO STRICT michal_user_id
  FROM auth.users
  WHERE lower(email) = 'michal.stepien36@gmail.com';

  SELECT id
  INTO STRICT lovable_user_id
  FROM auth.users
  WHERE lower(email) = 'lovable639@gmail.com';

  INSERT INTO public.user_roles (user_id, role)
  VALUES
    (michal_user_id, 'admin'),
    (michal_user_id, 'specialist'),
    (lovable_user_id, 'specialist')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_roles
  WHERE user_id = lovable_user_id
    AND role <> 'specialist';
END;
$$;
