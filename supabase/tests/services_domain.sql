BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-services-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Services","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '40000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-services-specialist-a@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Specialist","last_name":"A"}',
    now(), now(), false, false
  ),
  (
    '40000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-services-specialist-b@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Specialist","last_name":"B"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'admin'),
  ('40000000-0000-4000-8000-000000000002', 'specialist'),
  ('40000000-0000-4000-8000-000000000003', 'specialist');

CREATE TEMP TABLE services_test_ids AS
SELECT
  (SELECT id FROM public.specialists WHERE user_id = '40000000-0000-4000-8000-000000000002') AS specialist_a_id,
  (SELECT id FROM public.specialists WHERE user_id = '40000000-0000-4000-8000-000000000003') AS specialist_b_id;

GRANT SELECT ON services_test_ids TO authenticated, anon;

-- A new specialist starts inactive and off the site; the admin turns both on.
UPDATE public.specialists SET active = true, publicly_visible = true
WHERE id IN (SELECT specialist_a_id FROM services_test_ids UNION ALL SELECT specialist_b_id FROM services_test_ids);

-- A/B: admin creates and updates the global catalog.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible)
  VALUES
    ('Test Public Service', 'test-svc-public', 'psychotherapy', 50, true, true),
    ('Test Inactive Service', 'test-svc-inactive', 'psychotherapy', 50, false, true),
    ('Test Private Service', 'test-svc-private', 'consultation', 50, true, false),
    ('Test Effective Service', 'test-svc-effective', 'couples_therapy', 60, true, true);

  IF (SELECT count(*) FROM public.services WHERE slug LIKE 'test-svc-%') <> 4 THEN
    RAISE EXCEPTION 'A: admin could not create the global service catalog';
  END IF;

  UPDATE public.services
  SET short_description = 'Updated by admin test'
  WHERE slug = 'test-svc-public';

  IF (SELECT short_description FROM public.services WHERE slug = 'test-svc-public') <> 'Updated by admin test' THEN
    RAISE EXCEPTION 'B: admin update to a global service did not persist';
  END IF;
END;
$$;

RESET ROLE;

-- C/D/H/I/J/L/M/N/O/P/Q: specialist A configures their own offers.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
  public_service_id uuid;
  private_service_id uuid;
  effective_service_id uuid;
BEGIN
  SELECT id INTO public_service_id FROM public.services WHERE slug = 'test-svc-public';
  SELECT id INTO private_service_id FROM public.services WHERE slug = 'test-svc-private';
  SELECT id INTO effective_service_id FROM public.services WHERE slug = 'test-svc-effective';

  IF (SELECT count(*) FROM public.services WHERE slug LIKE 'test-svc-%') <> 3 THEN
    RAISE EXCEPTION 'H: specialist did not see exactly the active test services';
  END IF;

  IF EXISTS (SELECT 1 FROM public.services WHERE slug = 'test-svc-inactive') THEN
    RAISE EXCEPTION 'H: specialist unexpectedly read an inactive service';
  END IF;

  BEGIN
    INSERT INTO public.services (name, slug, default_duration_minutes)
    VALUES ('Unsafe Service', 'test-svc-unsafe', 50);
    RAISE EXCEPTION 'C: specialist unexpectedly created a global service';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.services SET name = 'Hacked' WHERE slug = 'test-svc-public';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'D: specialist unexpectedly updated a global service';
  END IF;

  INSERT INTO public.specialist_services (
    specialist_id, service_id, price_minor, duration_minutes,
    supports_in_person, supports_online
  )
  VALUES (
    (SELECT specialist_a_id FROM services_test_ids), public_service_id, 25000, NULL,
    true, true
  );

  BEGIN
    INSERT INTO public.specialist_services (specialist_id, service_id, price_minor)
    VALUES ((SELECT specialist_a_id FROM services_test_ids), '00000000-0000-4000-8000-000000000000', 10000);
    RAISE EXCEPTION 'J: specialist unexpectedly attached to a non-existent service';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.specialist_services (specialist_id, service_id, price_minor)
    VALUES ((SELECT specialist_a_id FROM services_test_ids), public_service_id, 30000);
    RAISE EXCEPTION 'M: duplicate specialist/service relationship was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.specialist_services (specialist_id, service_id, price_minor)
    VALUES ((SELECT specialist_a_id FROM services_test_ids), private_service_id, -100);
    RAISE EXCEPTION 'N: a negative price was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.specialist_services (specialist_id, service_id, price_minor)
    VALUES ((SELECT specialist_a_id FROM services_test_ids), private_service_id, 99999999);
    RAISE EXCEPTION 'N: a price above the sane upper bound was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.specialist_services (
      specialist_id, service_id, price_minor, active, supports_in_person, supports_online
    )
    VALUES (
      (SELECT specialist_a_id FROM services_test_ids), private_service_id, 10000, true, false, false
    );
    RAISE EXCEPTION 'O: an active offer with no modality was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  INSERT INTO public.specialist_services (
    specialist_id, service_id, price_minor,
    supports_in_person, supports_online
  )
  VALUES (
    (SELECT specialist_a_id FROM services_test_ids), effective_service_id, 20000,
    true, false
  );

  IF (
    SELECT duration_minutes FROM public.specialist_services
    WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids) AND service_id = public_service_id
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'P: expected NULL duration_minutes to prove the fallback case';
  END IF;
  IF (SELECT default_duration_minutes FROM public.services WHERE id = public_service_id) <> 50 THEN
    RAISE EXCEPTION 'P: unexpected service default duration';
  END IF;

  -- Q: an offer takes its service's duration; it cannot set its own.
  BEGIN
    UPDATE public.specialist_services SET duration_minutes = 45
    WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids) AND service_id = effective_service_id;
    RAISE EXCEPTION 'Q: an offer overrode its service''s duration';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  UPDATE public.specialist_services
  SET price_minor = 27000
  WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids) AND service_id = public_service_id;

  IF (
    SELECT price_minor FROM public.specialist_services
    WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids) AND service_id = public_service_id
  ) <> 27000 THEN
    RAISE EXCEPTION 'L: specialist update to their own price did not persist';
  END IF;
END;
$$;

RESET ROLE;

-- K: specialist B cannot modify specialist A's offer.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.specialist_services
  SET price_minor = 1
  WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
    AND service_id = (SELECT id FROM public.services WHERE slug = 'test-svc-public');
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'K: specialist B unexpectedly modified specialist A''s offer';
  END IF;
END;
$$;

RESET ROLE;

-- U: admin can inspect and manage specialist offers operationally.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.specialist_services
    WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
  ) <> 2 THEN
    RAISE EXCEPTION 'U: admin could not inspect all of specialist A''s offers';
  END IF;

  UPDATE public.specialist_services
  SET active = false
  WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
    AND service_id = (SELECT id FROM public.services WHERE slug = 'test-svc-effective');

  IF (
    SELECT active FROM public.specialist_services
    WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
      AND service_id = (SELECT id FROM public.services WHERE slug = 'test-svc-effective')
  ) IS NOT false THEN
    RAISE EXCEPTION 'U: admin could not manage a specialist offer row';
  END IF;
END;
$$;

RESET ROLE;

-- E/F/G/V: anonymous baseline visibility.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.services WHERE slug = 'test-svc-public') <> 1 THEN
    RAISE EXCEPTION 'E: anon could not read the active public service';
  END IF;

  IF EXISTS (SELECT 1 FROM public.services WHERE slug = 'test-svc-inactive') THEN
    RAISE EXCEPTION 'F: anon unexpectedly read an inactive service';
  END IF;

  IF EXISTS (SELECT 1 FROM public.services WHERE slug = 'test-svc-private') THEN
    RAISE EXCEPTION 'G: anon unexpectedly read a non-public service';
  END IF;

  IF (
    SELECT ss.price_minor
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug = 'test-svc-effective'
  ) <> 20000 THEN
    RAISE EXCEPTION 'V: anon could not read the safe fields of an effectively public offer';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug = 'test-svc-public'
  ) THEN
    RAISE EXCEPTION 'baseline: anon could not read the public-service offer before suppression tests';
  END IF;
END;
$$;

RESET ROLE;

-- R: an inactive global service suppresses the effective/public offering.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE public.services SET active = false WHERE slug = 'test-svc-effective';
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug = 'test-svc-effective'
  ) THEN
    RAISE EXCEPTION 'R: an inactive global service did not suppress the public offering';
  END IF;
END;
$$;

RESET ROLE;

-- T: an inactive specialist_service suppresses the public offering.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE public.services SET active = true WHERE slug = 'test-svc-effective';
  UPDATE public.specialist_services
  SET active = false
  WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
    AND service_id = (SELECT id FROM public.services WHERE slug = 'test-svc-effective');
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug = 'test-svc-effective'
  ) THEN
    RAISE EXCEPTION 'T: an inactive specialist_service did not suppress the public offering';
  END IF;
END;
$$;

RESET ROLE;

-- S: a specialist taken off the site takes every one of their public
-- offerings with them; an inactive one on the site keeps them shown.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE public.specialist_services
  SET active = true
  WHERE specialist_id = (SELECT specialist_a_id FROM services_test_ids)
    AND service_id = (SELECT id FROM public.services WHERE slug = 'test-svc-effective');
END;
$$;

RESET ROLE;

-- specialists has no client UPDATE grant at all (locked to service_role/RPCs
-- by the Specialist Domain's own design), so these toggles run at the
-- elevated connection role, not as authenticated/admin.
UPDATE public.specialists
SET active = false
WHERE id = (SELECT specialist_a_id FROM services_test_ids);
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug IN ('test-svc-public', 'test-svc-effective')
  ) THEN
    RAISE EXCEPTION 'S: an inactive specialist on the site lost their public offerings';
  END IF;
END;
$$;

RESET ROLE;
UPDATE public.specialists
SET publicly_visible = false
WHERE id = (SELECT specialist_a_id FROM services_test_ids);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.specialist_services ss
    JOIN public.services s ON s.id = ss.service_id
    WHERE s.slug IN ('test-svc-public', 'test-svc-effective')
  ) THEN
    RAISE EXCEPTION 'S: a specialist off the site did not suppress their public offerings';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
