BEGIN;

-- Visits (docs/product/booking-plan.md, RD2): free times worked out in the
-- database from availability, time off, room closures and other visits;
-- a hold that re-checks the time and cannot double-book, even in a race;
-- a guest's access by token. Everything is rolled back at the end.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-booking-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Booking","last_name":"Admin"}', now(), now(), false, false),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-booking-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Test"}', now(), now(), false, false),
  ('71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-booking-jan@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jan","last_name":"Test"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'admin'),
  ('71000000-0000-4000-8000-000000000002', 'specialist'),
  ('71000000-0000-4000-8000-000000000003', 'specialist');

UPDATE public.specialists SET public_slug = 'booking-test-anna', active = true, publicly_visible = true
WHERE user_id = '71000000-0000-4000-8000-000000000002';
UPDATE public.specialists SET public_slug = 'booking-test-jan', active = true, publicly_visible = true
WHERE user_id = '71000000-0000-4000-8000-000000000003';

INSERT INTO public.specialist_public_profiles (specialist_id, display_name, publication_status, published_at)
SELECT id, 'Anna Test', 'published', now() FROM public.specialists
WHERE public_slug IN ('booking-test-anna', 'booking-test-jan')
ON CONFLICT (specialist_id) DO UPDATE
SET publication_status = 'published', published_at = now();

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES
  ('Booking Location', 'booking-test-location', true, true),
  ('Booking Other Location', 'booking-test-other', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active)
SELECT id, 'Booking Room', 'booking-test-room', 2, true
FROM public.locations WHERE slug = 'booking-test-location';

-- Open every day 06:00–22:00 (a room without hours is closed).
INSERT INTO public.room_opening_hours (room_id, weekday, starts_at, ends_at)
SELECT room.id, day, '06:00', '22:00'
FROM public.rooms AS room CROSS JOIN generate_series(1, 7) AS day
WHERE room.slug = 'booking-test-room';

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Booking Consultation', 'booking-test-consultation', 'consultation', 50, true, true, true);

INSERT INTO public.specialist_services (
  specialist_id, service_id, active, price_minor,
  supports_in_person, supports_online
)
SELECT specialists.id, services.id, true, 25000, true, true
FROM public.specialists, public.services
WHERE specialists.public_slug IN ('booking-test-anna', 'booking-test-jan')
  AND services.slug = 'booking-test-consultation';

-- The centre: bookings on, a 60-minute grid, 10 minutes between visits,
-- an hour's notice, 60 days ahead, reminders a day before.
UPDATE public.center_settings
SET booking_enabled = true, slot_step_minutes = 60,
    default_visit_buffer_minutes = 10, min_booking_lead_minutes = 60,
    max_booking_horizon_days = 60, hold_minutes = 10,
    visit_reminder_hours = 24, payment_reminder_hours = 24;

-- Next week's Monday and Tuesday, where the centre is.
CREATE TEMP TABLE booking_test AS
SELECT
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 7) AS monday,
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 8) AS tuesday,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-anna') AS anna_id,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-jan') AS jan_id,
  (SELECT id FROM public.rooms WHERE slug = 'booking-test-room') AS room_id;
GRANT SELECT ON booking_test TO authenticated, anon, service_role;

-- Anna: Monday 9–12 in the room, Monday 13–15 online, Tuesday 9–11
-- hybrid (in the room, or online from it).
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT anna_id, 'weekly'::public.availability_recurrence, ARRAY[1]::smallint[], '09:00'::time, '12:00'::time, monday, 'in_person'::public.availability_mode, room_id FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[1]::smallint[], '13:00', '15:00', monday, 'online', NULL FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[2]::smallint[], '09:00', '11:00', monday, 'hybrid', room_id FROM booking_test;

-- Equivalent offers may share a calculation, but a different buffer must not.
INSERT INTO public.services (name, slug, category, default_duration_minutes, after_minutes, active, publicly_visible, booking_enabled)
VALUES ('Same Timing', 'booking-test-same', 'consultation', 50, 10, true, true, true),
 ('Long Buffer', 'booking-test-buffer', 'consultation', 50, 80, true, true, true);
UPDATE public.services SET after_minutes=10 WHERE slug='booking-test-consultation';
INSERT INTO public.specialist_services (specialist_id,service_id,active,price_minor,supports_in_person,supports_online)
SELECT specialist.id, service.id, true, 10000, true, true
FROM public.specialists specialist CROSS JOIN public.services service
WHERE specialist.public_slug='booking-test-anna' AND service.slug IN ('booking-test-same','booking-test-buffer');

SET LOCAL ROLE anon;
DO $$
DECLARE
  t booking_test%ROWTYPE;
  result jsonb;
  expected_count int;
  actual_count int;
BEGIN
  SELECT * INTO t FROM booking_test;
  result := public.specialist_availability('booking-test-anna', NULL, t.monday, t.monday+6);
  SELECT count(*) INTO expected_count FROM public.list_free_slots('booking-test-consultation','booking-test-anna','in_person',t.monday,t.monday+6,'booking-test-location');
  SELECT count(*) INTO actual_count FROM jsonb_array_elements(result->'slots') slot
  CROSS JOIN jsonb_array_elements(slot->'options') option
  WHERE option->>'service'='booking-test-consultation' AND option->>'mode'='stacjonarnie';
  IF actual_count <> expected_count THEN RAISE EXCEPTION 'Combined hours differ from original availability'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(result->'slots') slot
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-consultation')
      <> EXISTS (SELECT 1 FROM jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-same')
  ) THEN RAISE EXCEPTION 'Equivalent services must have equivalent times'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(result->'slots') slot
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-same')
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-buffer')
  ) THEN RAISE EXCEPTION 'Different buffers must stay separate'; END IF;
  result := public.specialist_availability('booking-test-anna','booking-test-buffer',t.monday,t.monday+6);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(result->'slots') slot WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-buffer')) THEN RAISE EXCEPTION 'Service filter must keep only hours that fit that service'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(result->'slots') slot CROSS JOIN jsonb_array_elements(slot->'options') o WHERE o->>'service'='booking-test-same') THEN RAISE EXCEPTION 'A service-filtered hour must retain other compatible services'; END IF;
  result := public.specialist_availability('booking-test-anna',NULL,NULL,NULL,true);
  IF jsonb_array_length(result->'slots')=0 OR (result->>'from')::date<>t.monday THEN RAISE EXCEPTION 'Nearest period must start with available week'; END IF;
  result := public.specialist_availability('does-not-exist',NULL,t.monday,t.monday+6);
  IF jsonb_array_length(result->'slots')<>0 THEN RAISE EXCEPTION 'Unknown specialist must not expose availability'; END IF;
  BEGIN
    PERFORM public.specialist_availability('booking-test-anna',NULL,t.monday,t.monday+60);
    RAISE EXCEPTION 'Oversized ranges must fail';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END $$;
RESET ROLE;
UPDATE public.specialist_public_profiles SET publication_status='draft', published_at=NULL WHERE specialist_id=(SELECT anna_id FROM booking_test);
SET LOCAL ROLE anon;
DO $$
DECLARE result jsonb;
BEGIN
 result:=public.specialist_availability('booking-test-anna',NULL,NULL,NULL,true);
 IF jsonb_array_length(result->'slots')<>0 THEN RAISE EXCEPTION 'Unpublished specialist must not expose hours'; END IF;
END $$;
RESET ROLE;
ROLLBACK;

