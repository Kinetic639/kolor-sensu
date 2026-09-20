INSERT INTO public.user_roles (user_id, role)
SELECT auth_user.id, assigned_role.value
FROM auth.users AS auth_user
CROSS JOIN unnest(
  ARRAY['admin', 'specialist']::public.app_role[]
) AS assigned_role(value)
WHERE lower(auth_user.email) = 'michal.stepien36@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
