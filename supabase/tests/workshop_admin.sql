-- The workshops' admin (20261023120000): only admins save, publish,
-- withdraw and delete; a workshop is saved whole (its co-leaders and online
-- link with it); publishing wants a short description and a future date;
-- withdrawing and deleting wait until nobody is signed up; the list counts
-- the seats; the site's switches for Warsztaty. Rolled back at the end.

BEGIN;

CREATE FUNCTION pg_temp.hint_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hint text;
BEGIN
  EXECUTE p_sql;
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  -- A permission refusal comes with a hint of its own: its code instead.
  IF SQLSTATE = '42501' THEN
    RETURN '42501';
  END IF;
  RETURN coalesce(nullif(v_hint, ''), SQLSTATE);
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7d000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-admin-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7d000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-admin-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false),
  ('7d000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'ws-admin-co@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Co"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7d000000-0000-4000-8000-000000000001', 'admin'),
  ('7d000000-0000-4000-8000-000000000002', 'specialist'),
  ('7d000000-0000-4000-8000-000000000003', 'specialist');

CREATE TEMP TABLE ws AS
SELECT
  (SELECT id FROM public.specialists WHERE user_id = '7d000000-0000-4000-8000-000000000002') AS leader,
  (SELECT id FROM public.specialists WHERE user_id = '7d000000-0000-4000-8000-000000000003') AS co_leader,
  ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw' AS t20;
GRANT SELECT ON ws TO authenticated, anon;

CREATE TEMP TABLE saved (id uuid);
GRANT SELECT, INSERT ON saved TO authenticated;

-- ------------------------------------------------------------ a specialist

SELECT set_config('request.jwt.claims',
  '{"sub":"7d000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF pg_temp.hint_of($sql$SELECT public.save_workshop(NULL, '{"title":"X"}')$sql$) <> '42501'
     OR pg_temp.hint_of($sql$SELECT public.admin_list_workshops()$sql$) <> '42501'
     OR pg_temp.hint_of($sql$SELECT public.set_workshop_visibility(false, false)$sql$) <> '42501' THEN
    RAISE EXCEPTION 'A: a specialist managed workshops';
  END IF;
END;
$$;
RESET ROLE;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"7d000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  f ws%ROWTYPE;
  v_id uuid;
  v_data jsonb;
  v_got jsonb;
BEGIN
  SELECT * INTO f FROM ws;
  v_data := jsonb_build_object(
    'slug', 'ws-admin-online', 'title', 'Warsztat online',
    'specialist_id', f.leader, 'co_leader_ids', jsonb_build_array(f.co_leader, f.leader),
    'modality', 'online', 'starts_at', f.t20, 'ends_at', f.t20 + interval '2 hours',
    'price_minor', 9000, 'capacity', 10, 'min_participants', 3,
    'registration_enabled', true, 'meeting_url', 'https://meet.example.invalid/ws'
  );

  -- B: saved whole: its co-leader (not the main leader twice) and its link.
  v_id := public.save_workshop(NULL, v_data);
  INSERT INTO saved VALUES (v_id);
  v_got := public.admin_get_workshop(v_id);
  IF v_got->>'status' <> 'draft'
     OR v_got->'co_leader_ids' <> jsonb_build_array(f.co_leader)
     OR v_got->>'meeting_url' <> 'https://meet.example.invalid/ws' THEN
    RAISE EXCEPTION 'B: the workshop was not saved whole: %', v_got;
  END IF;

  -- C: another workshop at the same address is refused.
  IF pg_temp.hint_of(format('SELECT public.save_workshop(NULL, %L)', v_data)) <> 'slug_taken' THEN
    RAISE EXCEPTION 'C: an address was taken twice';
  END IF;

  -- D: publishing wants a short description; then it is published.
  IF pg_temp.hint_of(format('SELECT public.publish_workshop(%L)', v_id)) <> 'incomplete' THEN
    RAISE EXCEPTION 'D: an incomplete workshop was published';
  END IF;
  PERFORM public.save_workshop(v_id, v_data || jsonb_build_object(
    'short_description', 'Krótko o warsztacie', 'co_leader_ids', '[]'::jsonb));
  IF public.admin_get_workshop(v_id)->'co_leader_ids' <> '[]'::jsonb THEN
    RAISE EXCEPTION 'D: the co-leader was not removed';
  END IF;
  PERFORM public.publish_workshop(v_id);
  IF (SELECT status FROM public.workshops WHERE id = v_id) <> 'published' THEN
    RAISE EXCEPTION 'D: the workshop was not published';
  END IF;

  -- E: back to a draft while nobody signed up; a past date cannot publish.
  PERFORM public.unpublish_workshop(v_id);
  PERFORM public.save_workshop(v_id, v_data || jsonb_build_object(
    'short_description', 'Krótko', 'starts_at', now() - interval '2 days',
    'ends_at', now() - interval '2 days' + interval '1 hour'));
  IF pg_temp.hint_of(format('SELECT public.publish_workshop(%L)', v_id)) <> 'incomplete' THEN
    RAISE EXCEPTION 'E: a past workshop was published';
  END IF;
  PERFORM public.save_workshop(v_id, v_data || jsonb_build_object('short_description', 'Krótko'));
  PERFORM public.publish_workshop(v_id);
END;
$$;
RESET ROLE;

-- Someone signs up (the site's server does this).
SELECT public.hold_workshop_seat('ws-admin-online', 'ws-admin-visitor-1');

SELECT set_config('request.jwt.claims',
  '{"sub":"7d000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_id uuid := (SELECT id FROM saved);
  v_row record;
BEGIN
  -- F: with someone signed up, no withdrawing and no deleting.
  IF pg_temp.hint_of(format('SELECT public.unpublish_workshop(%L)', v_id)) <> 'has_registrations'
     OR pg_temp.hint_of(format('SELECT public.delete_workshop(%L)', v_id)) <> 'has_registrations' THEN
    RAISE EXCEPTION 'F: a workshop with a sign-up was withdrawn or deleted';
  END IF;

  -- G: the list counts the held seat.
  SELECT * INTO v_row FROM public.admin_list_workshops() WHERE id = v_id;
  IF v_row.held_count <> 1 OR v_row.confirmed OR v_row.leaders IS NULL THEN
    RAISE EXCEPTION 'G: the list was wrong: %', row_to_json(v_row);
  END IF;

  -- H: a draft nobody signed up for is deleted.
  PERFORM public.save_workshop(NULL, jsonb_build_object(
    'slug', 'ws-admin-draft', 'title', 'Szkic',
    'specialist_id', (SELECT leader FROM ws), 'modality', 'online',
    'starts_at', (SELECT t20 FROM ws) + interval '1 day',
    'ends_at', (SELECT t20 FROM ws) + interval '1 day 2 hours',
    'price_minor', 0, 'capacity', 5));
  PERFORM public.delete_workshop((SELECT id FROM public.workshops WHERE slug = 'ws-admin-draft'));
  IF EXISTS (SELECT 1 FROM public.workshops WHERE slug = 'ws-admin-draft') THEN
    RAISE EXCEPTION 'H: the draft was not deleted';
  END IF;

  -- I: the site's switches.
  PERFORM public.set_workshop_visibility(false, NULL);
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT in_menu FROM public.workshop_visibility()) OR NOT (SELECT on_home FROM public.workshop_visibility()) THEN
    RAISE EXCEPTION 'I: the switches were not read as set';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
