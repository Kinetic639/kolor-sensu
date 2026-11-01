-- Workshop participants' data (20261025120000, #183): the nightly
-- retention anonymises the seats of workshops ended over 12 months ago,
-- keeps the amounts, takes the name out of the notifications, and spares
-- a seat still owed a refund; an admin removes a participant's data on
-- request once the seat is over, not before, and only once; no one else
-- can; a sign-up never finished loses its details after 30 days. Rolled
-- back at the end.

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
  ('7f000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-ret-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7f000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-ret-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7f000000-0000-4000-8000-000000000001', 'admin'),
  ('7f000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online', w.at, w.at + interval '2 hours',
  10000, 5, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-ret-old', 'Dawny', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw'),
  ('ws-ret-recent', 'Niedawny', ((current_date + 21) + time '17:00') AT TIME ZONE 'Europe/Warsaw'),
  ('ws-ret-future', 'Przyszły', ((current_date + 22) + time '17:00') AT TIME ZONE 'Europe/Warsaw')
) AS w(slug, title, at)
WHERE specialist.user_id = '7f000000-0000-4000-8000-000000000002';

-- A paid seat on each; on the old one also a cancelled seat still owed a
-- refund. Then the old and the recent workshops happen (as postgres).
DO $$
DECLARE
  v_token text;
  v_seat record;
BEGIN
  FOR v_seat IN
    SELECT * FROM (VALUES
      ('ws-ret-old', 'anna'), ('ws-ret-old', 'basia'),
      ('ws-ret-recent', 'cela'), ('ws-ret-future', 'dora')
    ) AS s(slug, name)
  LOOP
    SELECT access_token INTO v_token FROM public.hold_workshop_seat(v_seat.slug, 'ws-ret-' || v_seat.name);
    PERFORM public.save_workshop_registration_details(v_token, initcap(v_seat.name),
      v_seat.name || '-ret@example.invalid', '500600700', 'Uwagi', true, true);
    UPDATE public.workshop_registrations
    SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), hold_expires_at = NULL
    WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  END LOOP;
  UPDATE public.workshop_registrations
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client', refund_due_minor = 10000
  WHERE client_email = 'basia-ret@example.invalid';

  UPDATE public.workshops
  SET starts_at = now() - interval '13 months', ends_at = now() - interval '13 months' + interval '2 hours'
  WHERE slug = 'ws-ret-old';
  UPDATE public.workshops
  SET starts_at = now() - interval '2 months', ends_at = now() - interval '2 months' + interval '2 hours'
  WHERE slug = 'ws-ret-recent';
END;
$$;

-- A: the nightly retention.
DO $$
DECLARE
  v_anna record;
  v_reference text;
BEGIN
  SELECT reference INTO v_reference FROM public.workshop_registrations
  WHERE client_email = 'anna-ret@example.invalid';
  PERFORM private.apply_retention();

  SELECT * INTO v_anna FROM public.workshop_registrations WHERE reference = v_reference;
  IF v_anna.client_name <> 'Uczestnik usunięty'
     OR v_anna.client_email NOT LIKE '%@anonim.invalid'
     OR v_anna.client_phone IS NOT NULL OR v_anna.client_notes IS NOT NULL
     OR v_anna.forgotten_at IS NULL THEN
    RAISE EXCEPTION 'A: the old seat was not anonymised: % %', v_anna.client_name, v_anna.client_email;
  END IF;
  IF v_anna.paid_minor <> 10000 OR v_anna.status <> 'confirmed' THEN
    RAISE EXCEPTION 'A: the books lost the old seat''s payment';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE details ->> 'reference' = v_reference AND details ->> 'client_name' <> 'Uczestnik usunięty'
  ) THEN
    RAISE EXCEPTION 'A: a notification still names the old participant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workshop_registrations WHERE client_email = 'basia-ret@example.invalid') THEN
    RAISE EXCEPTION 'A: a seat still owed a refund was anonymised';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workshop_registrations WHERE client_email = 'cela-ret@example.invalid') THEN
    RAISE EXCEPTION 'A: a workshop ended two months ago lost its participants';
  END IF;
END;
$$;

-- B: the admin, on request.
SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_dora uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'dora-ret@example.invalid');
  v_cela uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'cela-ret@example.invalid');
  v_basia uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'basia-ret@example.invalid');
BEGIN
  IF pg_temp.hint_of(format('SELECT public.forget_workshop_participant(%L)', v_dora)) <> 'participant_busy' THEN
    RAISE EXCEPTION 'B: a seat on a workshop to come was removed';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.forget_workshop_participant(%L)', v_basia)) <> 'participant_busy' THEN
    RAISE EXCEPTION 'B: a seat owed a refund was removed';
  END IF;
  PERFORM public.forget_workshop_participant(v_cela);
  IF (SELECT client_name FROM public.workshop_registrations WHERE id = v_cela) <> 'Uczestnik usunięty' THEN
    RAISE EXCEPTION 'B: the request did not remove the data';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.forget_workshop_participant(%L)', v_cela)) <> 'already_forgotten' THEN
    RAISE EXCEPTION 'B: the data was removed twice';
  END IF;
END;
$$;
RESET ROLE;

-- C: a specialist, even the leader, cannot.
SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.forget_workshop_participant(%L)',
      (SELECT id FROM public.workshop_registrations WHERE reference LIKE '%' ORDER BY created_at LIMIT 1))) <> '42501' THEN
    RAISE EXCEPTION 'C: a specialist removed a participant''s data';
  END IF;
END;
$$;
RESET ROLE;

-- D: a sign-up never finished (Warsztat · 3, card 9): its details go 30
-- days after its hold ran out; one held a month ago that became a seat,
-- and one given up only 10 days ago, keep theirs.
DO $$
DECLARE
  v_token text;
  v_seat record;
BEGIN
  FOR v_seat IN
    SELECT * FROM (VALUES ('ewa', 31), ('fela', 10), ('gosia', 31)) AS s(name, days)
  LOOP
    SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-ret-future', 'ws-ret-' || v_seat.name);
    PERFORM public.save_workshop_registration_details(v_token, initcap(v_seat.name),
      v_seat.name || '-ret@example.invalid', '500600700', 'Uwagi', true, true);
    UPDATE public.workshop_registrations
    SET hold_expires_at = now() - make_interval(days => v_seat.days),
        created_at = now() - make_interval(days => v_seat.days)
    WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  END LOOP;
  -- Ewa's and Fela's holds ran out; Gosia's seat was paid back then.
  UPDATE public.workshop_registrations SET status = 'expired'
  WHERE client_email IN ('ewa-ret@example.invalid', 'fela-ret@example.invalid');
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 10000, confirmed_at = now() - interval '31 days', hold_expires_at = NULL
  WHERE client_email = 'gosia-ret@example.invalid';

  PERFORM private.apply_retention();
  IF EXISTS (SELECT 1 FROM public.workshop_registrations WHERE client_email = 'ewa-ret@example.invalid')
     OR (SELECT client_name FROM public.workshop_registrations
         WHERE reference = (SELECT reference FROM public.workshop_registrations
                            WHERE status = 'expired' AND hold_expires_at < now() - interval '30 days'
                            ORDER BY created_at LIMIT 1)) IS NOT NULL THEN
    RAISE EXCEPTION 'D: an unfinished sign-up kept its details after 30 days';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workshop_registrations WHERE client_email = 'fela-ret@example.invalid')
     OR NOT EXISTS (SELECT 1 FROM public.workshop_registrations WHERE client_email = 'gosia-ret@example.invalid') THEN
    RAISE EXCEPTION 'D: a recent sign-up or a real seat lost its details';
  END IF;
END;
$$;

ROLLBACK;
