BEGIN;

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES
  (
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'auth-test-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Test","last_name":"Specialist"}',
    now(),
    now(),
    false,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'auth-test-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Test","last_name":"Admin"}',
    now(),
    now(),
    false,
    false
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    'auth-test-dual@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Test","last_name":"Dual"}',
    now(),
    now(),
    false,
    false
  );

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles
    WHERE id IN (
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000003'
    )
  ) <> 3 THEN
    RAISE EXCEPTION 'Profile trigger did not create all profiles';
  END IF;
END;
$$;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'specialist'),
  ('10000000-0000-4000-8000-000000000002', 'admin'),
  ('10000000-0000-4000-8000-000000000003', 'admin'),
  ('10000000-0000-4000-8000-000000000003', 'specialist');

SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.profiles LIMIT 1;
    RAISE EXCEPTION 'Anonymous role unexpectedly read profiles';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.has_role('admin');
    RAISE EXCEPTION 'Anonymous role unexpectedly executed has_role';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.profiles) <> 1 THEN
    RAISE EXCEPTION 'Specialist did not see exactly their own profile';
  END IF;

  IF (SELECT count(*) FROM public.user_roles) <> 1 THEN
    RAISE EXCEPTION 'Specialist did not see exactly their own role';
  END IF;

  IF public.has_role('admin') OR NOT public.has_role('specialist') THEN
    RAISE EXCEPTION 'Specialist role authorization returned an unsafe result';
  END IF;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('10000000-0000-4000-8000-000000000001', 'admin');
    RAISE EXCEPTION 'Specialist unexpectedly inserted an admin role';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.user_roles
    SET role = 'admin'
    WHERE user_id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Specialist unexpectedly updated a role';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.user_roles
    WHERE user_id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'Specialist unexpectedly deleted a role';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF NOT public.has_role('admin') OR public.has_role('specialist') THEN
    RAISE EXCEPTION 'Admin-only authorization returned an unsafe result';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF NOT public.has_role('admin') OR NOT public.has_role('specialist') THEN
    RAISE EXCEPTION 'Dual-role authorization did not pass both checks';
  END IF;
END;
$$;

RESET ROLE;

DO $$
DECLARE
  helper_arguments integer;
  helper_is_security_definer boolean;
BEGIN
  SELECT pronargs, prosecdef
  INTO helper_arguments, helper_is_security_definer
  FROM pg_proc
  WHERE oid = 'public.has_role(public.app_role)'::regprocedure;

  IF helper_arguments <> 1 OR helper_is_security_definer THEN
    RAISE EXCEPTION 'Role helper exposes unsafe arguments or privileges';
  END IF;
END;
$$;

ROLLBACK;
