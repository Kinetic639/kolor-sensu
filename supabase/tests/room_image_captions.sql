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


SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  room uuid := (SELECT room_id FROM room_images_test);
  photo uuid;
  other_photo uuid;
BEGIN
  photo := public.add_room_image(room, room::text || '/caption-a.webp');
  other_photo := public.add_room_image(room, room::text || '/caption-b.webp');
  IF (SELECT caption FROM public.room_images WHERE id = photo) <> '' THEN
    RAISE EXCEPTION 'New photos should have an empty caption';
  END IF;
  PERFORM public.update_room_image_caption(room, photo, '  Fotele przy oknie  ');
  IF (SELECT caption FROM public.room_images WHERE id = photo) <> 'Fotele przy oknie'
    OR (SELECT caption FROM public.room_images WHERE id = other_photo) <> '' THEN
    RAISE EXCEPTION 'Caption must be trimmed and belong only to its photo';
  END IF;
  BEGIN
    PERFORM public.update_room_image_caption(room, photo, repeat('x', 201));
    RAISE EXCEPTION 'An oversized caption was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.update_room_image_caption(gen_random_uuid(), photo, 'Wrong room');
    RAISE EXCEPTION 'An image from another room was accepted';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  BEGIN
    UPDATE public.room_images SET caption = 'Direct edit' WHERE id = photo;
    RAISE EXCEPTION 'Direct edits should remain forbidden';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.update_room_image_caption(room, photo, '');
  IF (SELECT caption FROM public.room_images WHERE id = photo) <> '' THEN
    RAISE EXCEPTION 'Clearing a caption failed';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM public.update_room_image_caption(gen_random_uuid(), gen_random_uuid(), 'Denied');
  RAISE EXCEPTION 'A specialist edited a caption';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END; $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM public.update_room_image_caption(gen_random_uuid(), gen_random_uuid(), 'Denied');
  RAISE EXCEPTION 'An anonymous visitor edited a caption';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END; $$;
RESET ROLE;
ROLLBACK;
