BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '40000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'room-images-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Room","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '40000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'room-images-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Room","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'admin'),
  ('40000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Room Images Location', 'room-images-location', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active, publicly_visible)
VALUES (
  (SELECT id FROM public.locations WHERE slug = 'room-images-location'),
  'Room Images Test', 'room-images-test', 2, true, true
);

CREATE TEMP TABLE room_images_test AS
SELECT id AS room_id FROM public.rooms WHERE slug = 'room-images-test';
GRANT SELECT ON room_images_test TO authenticated, anon;

-- Only admins change a room's photos.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM public.add_room_image(
    (SELECT room_id FROM room_images_test),
    (SELECT room_id FROM room_images_test)::text || '/nope.webp'
  );
  RAISE EXCEPTION 'A: a specialist added a room photo';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  room uuid := (SELECT room_id FROM room_images_test);
  a uuid;
  b uuid;
  c uuid;
  step integer;
BEGIN
  a := public.add_room_image(room, room::text || '/a.webp');
  b := public.add_room_image(room, room::text || '/b.webp');
  c := public.add_room_image(room, room::text || '/c.webp');

  IF (SELECT is_main FROM public.room_images WHERE id = a) IS NOT TRUE
    OR (SELECT count(*) FROM public.room_images WHERE room_id = room AND is_main) <> 1
  THEN
    RAISE EXCEPTION 'B: the first photo is not the only main one';
  END IF;

  PERFORM public.reorder_room_images(room, ARRAY[c, a, b]);
  IF (SELECT array_agg(id ORDER BY position) FROM public.room_images WHERE room_id = room)
    <> ARRAY[c, a, b]
  THEN
    RAISE EXCEPTION 'C: the new order was not saved';
  END IF;

  PERFORM public.set_room_main_image(b);
  IF (SELECT array_agg(id) FROM public.room_images WHERE room_id = room AND is_main)
    <> ARRAY[b]
  THEN
    RAISE EXCEPTION 'D: the main photo did not move';
  END IF;

  -- Removing the main photo promotes the first one and closes the gap.
  PERFORM public.remove_room_image(b);
  IF (SELECT array_agg(id ORDER BY position) FROM public.room_images WHERE room_id = room)
    <> ARRAY[c, a]
    OR (SELECT is_main FROM public.room_images WHERE id = c) IS NOT TRUE
    OR (SELECT max(position) FROM public.room_images WHERE room_id = room) <> 1
  THEN
    RAISE EXCEPTION 'E: removing the main photo left a gap or no main photo';
  END IF;

  FOR step IN 1..1 LOOP
    PERFORM public.add_room_image(room, room::text || '/x' || step || '.webp');
  END LOOP;

  BEGIN
    PERFORM public.add_room_image(room, room::text || '/fourth.webp');
    RAISE EXCEPTION 'F: a fourth photo was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    PERFORM public.reorder_room_images(room, ARRAY[a]);
    RAISE EXCEPTION 'G: an order missing photos was accepted';
  EXCEPTION
    WHEN invalid_parameter_value THEN NULL;
  END;

  BEGIN
    PERFORM public.add_room_image(room, gen_random_uuid()::text || '/other.webp');
    RAISE EXCEPTION 'H: a photo outside the room folder was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END;
$$;

-- Visitors see the photos only once the room's profile is published.
RESET ROLE;
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.room_images
    WHERE room_id = (SELECT room_id FROM room_images_test)
  ) THEN
    RAISE EXCEPTION 'I: photos of an unpublished room were visible';
  END IF;
END;
$$;

RESET ROLE;
INSERT INTO public.room_public_profiles (room_id, display_name, published)
VALUES ((SELECT room_id FROM room_images_test), 'Room Images Test', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.room_images
    WHERE room_id = (SELECT room_id FROM room_images_test)
  ) <> 3 THEN
    RAISE EXCEPTION 'J: photos of a published room were not visible';
  END IF;
END;
$$;

ROLLBACK;
