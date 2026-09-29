BEGIN;

-- Colours of rooms and specialists (schedules, lists): #rrggbb or none
-- (automatic). Admins set them; a specialist cannot set their own.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('80000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-colors-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Colors","last_name":"Admin"}', now(), now(), false, false),
  ('80000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-colors-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Colors","last_name":"Specialist"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('80000000-0000-4000-8000-000000000001', 'admin'),
  ('80000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Test Location Colors', 'test-loc-colors', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active)
SELECT id, 'Colors Room', 'colors-room', 1, true
FROM public.locations WHERE slug = 'test-loc-colors';

CREATE TEMP TABLE colors_test_ids AS
SELECT
  (SELECT id FROM public.rooms WHERE slug = 'colors-room') AS room_id,
  (SELECT id FROM public.specialists WHERE user_id = '80000000-0000-4000-8000-000000000002') AS specialist_id;
GRANT SELECT ON colors_test_ids TO authenticated;

-- A: new rooms and specialists have no colour (automatic).
DO $$
BEGIN
  IF (SELECT color FROM public.rooms WHERE id = (SELECT room_id FROM colors_test_ids)) IS NOT NULL
     OR (SELECT color FROM public.specialists WHERE id = (SELECT specialist_id FROM colors_test_ids)) IS NOT NULL THEN
    RAISE EXCEPTION 'A: a new room or specialist has a colour';
  END IF;
END;
$$;

-- The specialist cannot set their own colour.
SELECT set_config('request.jwt.claims', '{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.set_specialist_color((SELECT specialist_id FROM colors_test_ids), '#286e4d');
    RAISE EXCEPTION 'B: a specialist set their own colour';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- The admin sets and clears colours; only #rrggbb is stored.
SELECT set_config('request.jwt.claims', '{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE public.rooms SET color = '#2f5fa7' WHERE id = (SELECT room_id FROM colors_test_ids);
  IF (SELECT color FROM public.rooms WHERE id = (SELECT room_id FROM colors_test_ids)) <> '#2f5fa7' THEN
    RAISE EXCEPTION 'C: the admin could not set a room''s colour';
  END IF;
  BEGIN
    UPDATE public.rooms SET color = 'blue' WHERE id = (SELECT room_id FROM colors_test_ids);
    RAISE EXCEPTION 'D: a room took a colour that is not #rrggbb';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE public.rooms SET color = '#2F5FA7' WHERE id = (SELECT room_id FROM colors_test_ids);
    RAISE EXCEPTION 'D: a room took an uppercase colour';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.set_specialist_color((SELECT specialist_id FROM colors_test_ids), '#B4436C');
  IF (SELECT color FROM public.specialists WHERE id = (SELECT specialist_id FROM colors_test_ids)) <> '#b4436c' THEN
    RAISE EXCEPTION 'E: the admin could not set a specialist''s colour';
  END IF;
  BEGIN
    PERFORM public.set_specialist_color((SELECT specialist_id FROM colors_test_ids), 'pink');
    RAISE EXCEPTION 'F: a specialist took a colour that is not #rrggbb';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.set_specialist_color((SELECT specialist_id FROM colors_test_ids), NULL);
  IF (SELECT color FROM public.specialists WHERE id = (SELECT specialist_id FROM colors_test_ids)) IS NOT NULL THEN
    RAISE EXCEPTION 'G: the admin could not go back to the automatic colour';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
