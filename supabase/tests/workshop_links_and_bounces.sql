-- A participant's e-mails and the waitlist (20261101140000, Warsztat · 6
-- and 7): a link from an older e-mail keeps leading to the seat, after a
-- new date or the link sent again; the admin sends the link again, not
-- twice in five minutes; a bounced e-mail shows by the participant until
-- the address changes; an offer that ran out goes to the next on the
-- waitlist, never to someone who left it; an online workshop without its
-- link alarms the admins once and its reminder waits for the link.
-- Rolled back at the end.

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
    'ws-links-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7f000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-links-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7f000000-0000-4000-8000-000000000001', 'admin'),
  ('7f000000-0000-4000-8000-000000000002', 'specialist');

-- A: one seat, 20 days ahead; B: free, online, in 30 hours, no link.
INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online', w.at, w.at + interval '2 hours',
  w.price, w.seats, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-links-a', 'Warsztat A', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 10000, 1),
  ('ws-links-b', 'Warsztat B', now() + interval '30 hours', 0, 5)
) AS w(slug, title, at, price, seats)
WHERE specialist.user_id = '7f000000-0000-4000-8000-000000000002';

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);
GRANT SELECT ON tokens TO authenticated;

-- A: Anna's paid seat, then Bea, Cela and Dora on the waitlist; B: Ewa's
-- free seat.
DO $$
DECLARE
  v_token text;
  v_name text;
BEGIN
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-links-a', 'ws-links-anna');
  INSERT INTO tokens VALUES ('anna', v_token);
  PERFORM public.save_workshop_registration_details(v_token, 'Anna', 'anna@example.invalid', NULL, NULL, true, true);
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), hold_expires_at = NULL
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  FOREACH v_name IN ARRAY ARRAY['bea', 'cela', 'dora'] LOOP
    SELECT access_token INTO v_token FROM public.join_workshop_waitlist(
      'ws-links-a', 'ws-links-' || v_name, initcap(v_name), v_name || '@example.invalid', NULL, NULL, true, true);
    INSERT INTO tokens VALUES (v_name, v_token);
  END LOOP;

  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-links-b', 'ws-links-ewa');
  INSERT INTO tokens VALUES ('ewa', v_token);
  PERFORM public.save_workshop_registration_details(v_token, 'Ewa', 'ewa@example.invalid', NULL, NULL, true, true);
  PERFORM public.confirm_free_workshop_seat(v_token);
END;
$$;

CREATE TEMP TABLE mails (name text PRIMARY KEY, token text NOT NULL);
GRANT SELECT ON mails TO authenticated;

DO $$
DECLARE
  v_a uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-links-a');
  v_ref text := (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'anna')));
  v_mail record;
BEGIN
  -- A (card 6): the confirmation, then a new date's e-mail, twice: each
  -- earlier link still opens the seat, with the date as it is now.
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_ref, 'confirmation');
  INSERT INTO mails VALUES ('confirmation', v_mail.manage_token);
  PERFORM public.mark_workshop_email_sent(v_ref, 'confirmation', 'msg-links-anna');

  UPDATE public.workshops SET starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day' WHERE id = v_a;
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_ref, 'rescheduled');
  INSERT INTO mails VALUES ('rescheduled', v_mail.manage_token);
  PERFORM public.mark_workshop_email_sent(v_ref, 'rescheduled', 'msg-links-anna-2');

  UPDATE public.workshops SET starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day' WHERE id = v_a;
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_ref AND kind = 'rescheduled') THEN
    RAISE EXCEPTION 'A: the second new date was not to be e-mailed';
  END IF;
  IF (SELECT manage_token FROM public.claim_workshop_email(v_ref, 'rescheduled')) IS NULL THEN
    RAISE EXCEPTION 'A: the second new date''s e-mail was not claimed';
  END IF;
  IF (SELECT count(*) FROM mails AS m
      JOIN LATERAL public.get_workshop_registration(m.token) AS r ON true
      WHERE r.status = 'confirmed'
        AND r.starts_at = (SELECT starts_at FROM public.workshops WHERE id = v_a)) <> 2 THEN
    RAISE EXCEPTION 'A: an older e-mail''s link no longer led to the seat as it is';
  END IF;
END;
$$;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_anna uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'anna@example.invalid');
  v_bea uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'bea@example.invalid');
  v_sent record;
BEGIN
  -- B (card 8): the confirmation again; the waitlist's place for Bea.
  SELECT * INTO v_sent FROM public.centre_resend_workshop_link(v_anna);
  IF v_sent.kind IS DISTINCT FROM 'confirmation' THEN
    RAISE EXCEPTION 'B: a confirmed seat''s link was not to go again: %', row_to_json(v_sent);
  END IF;
  IF (SELECT kind FROM public.centre_resend_workshop_link(v_bea)) IS DISTINCT FROM 'waitlisted' THEN
    RAISE EXCEPTION 'B: the waitlist''s place was not to go again';
  END IF;
END;
$$;
RESET ROLE;

DO $$
DECLARE
  v_ref text := (SELECT reference FROM public.workshop_registrations WHERE client_email = 'anna@example.invalid');
  v_mail record;
BEGIN
  -- B: the site claims it: a new link; the first e-mail's still works.
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_ref, 'confirmation');
  IF v_mail.manage_token IS NULL
     OR v_mail.manage_token = (SELECT token FROM mails WHERE name = 'confirmation') THEN
    RAISE EXCEPTION 'B: the link sent again was not new';
  END IF;
  IF (SELECT client_email FROM public.get_workshop_registration(v_mail.manage_token)) <> 'anna@example.invalid'
     OR (SELECT client_email FROM public.get_workshop_registration((SELECT token FROM mails WHERE name = 'confirmation'))) <> 'anna@example.invalid' THEN
    RAISE EXCEPTION 'B: the new or the first link did not open the seat';
  END IF;
  PERFORM public.mark_workshop_email_sent(v_ref, 'confirmation', 'msg-links-anna-3');
  IF (SELECT message_id FROM public.workshop_emails
      WHERE token_hash = extensions.digest((SELECT token FROM mails WHERE name = 'confirmation'), 'sha256')) <> 'msg-links-anna' THEN
    RAISE EXCEPTION 'B: the first e-mail took the new one''s message';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_anna uuid := (SELECT id FROM public.workshop_registrations WHERE client_email = 'anna@example.invalid');
BEGIN
  -- B: not twice in five minutes.
  IF pg_temp.hint_of(format('SELECT public.centre_resend_workshop_link(%L)', v_anna)) <> 'recently_sent' THEN
    RAISE EXCEPTION 'B: the link went twice in five minutes';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.centre_resend_workshop_link(%L)', gen_random_uuid())) <> 'not_found' THEN
    RAISE EXCEPTION 'B: a registration that is not there';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  -- B: a leader cannot (the admins send it).
  IF pg_temp.hint_of(format('SELECT public.centre_resend_workshop_link(%L)',
      (SELECT id FROM public.workshop_registrations WHERE client_email = 'ewa@example.invalid'))) <> '42501' THEN
    RAISE EXCEPTION 'B: a leader sent the link again';
  END IF;
END;
$$;
RESET ROLE;

DO $$
DECLARE
  v_ref text := (SELECT reference FROM public.workshop_registrations WHERE client_email = 'anna@example.invalid');
BEGIN
  -- C (card 9): the first confirmation bounced: Anna is marked, once.
  IF public.mark_workshop_email_bounced('msg-links-anna') IS DISTINCT FROM v_ref THEN
    RAISE EXCEPTION 'C: the bounce was not told to the seat';
  END IF;
  IF public.mark_workshop_email_bounced('msg-links-anna') IS NOT NULL
     OR public.mark_workshop_email_bounced('msg-not-ours') IS NOT NULL THEN
    RAISE EXCEPTION 'C: a bounce marked twice, or one not ours';
  END IF;
END;
$$;

SELECT set_config('request.jwt.claims',
  '{"sub":"7f000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  -- C: the admin sees it by the participant.
  IF (SELECT email_bounced_at FROM public.workshop_registrations WHERE client_email = 'anna@example.invalid') IS NULL THEN
    RAISE EXCEPTION 'C: the admin did not see the bounce';
  END IF;
END;
$$;
RESET ROLE;

DO $$
DECLARE
  v_reg record;
BEGIN
  -- C: a new address has not bounced.
  UPDATE public.workshop_registrations SET client_email = 'anna.nowa@example.invalid'
  WHERE client_email = 'anna@example.invalid';
  IF (SELECT email_bounced_at FROM public.workshop_registrations WHERE client_email = 'anna.nowa@example.invalid') IS NOT NULL THEN
    RAISE EXCEPTION 'C: the new address kept the bounce';
  END IF;

  -- D (card 7.3): Anna gives the seat up; Bea is offered it, lets the
  -- offer run out, and it goes to Cela.
  PERFORM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'anna'));
  UPDATE public.workshop_registrations SET offer_expires_at = now() - interval '1 minute'
  WHERE client_email = 'bea@example.invalid' AND status = 'offered';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'D: Bea was not offered the freed seat';
  END IF;
  PERFORM public.run_workshop_jobs();
  SELECT * INTO v_reg FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'cela'));
  IF (SELECT status FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'bea'))) <> 'expired'
     OR v_reg.status <> 'offered' OR v_reg.offer_expires_at < now() + interval '23 hours' THEN
    RAISE EXCEPTION 'D: the seat did not go to the next on the waitlist: %', row_to_json(v_reg);
  END IF;

  -- E (card 7.4): Dora leaves the waitlist; when Cela's offer runs out,
  -- nobody is offered the seat.
  PERFORM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'dora'));
  UPDATE public.workshop_registrations SET offer_expires_at = now() - interval '1 minute'
  WHERE client_email = 'cela@example.invalid';
  PERFORM public.run_workshop_jobs();
  IF (SELECT status FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'dora'))) <> 'cancelled'
     OR EXISTS (SELECT 1 FROM public.workshop_registrations AS r
       JOIN public.workshops AS w ON w.id = r.workshop_id
       WHERE w.slug = 'ws-links-a' AND r.status = 'offered') THEN
    RAISE EXCEPTION 'E: someone who left the waitlist was offered the seat';
  END IF;
END;
$$;

DO $$
DECLARE
  v_b uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-links-b');
  v_ref text := (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'ewa')));
BEGIN
  -- F (card 10): B is online in 30 hours with no link: the admins and the
  -- leader hear of it once; A (weeks ahead) not yet.
  IF public.remind_missing_workshop_links() <> 1 OR public.remind_missing_workshop_links() <> 0 THEN
    RAISE EXCEPTION 'F: the missing link was not told once';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE kind = 'workshop_no_link' AND portal = 'admin' AND details->>'workshop_id' = v_b::text)
     OR NOT EXISTS (SELECT 1 FROM public.notifications WHERE kind = 'workshop_no_link' AND portal = 'specialist' AND details->>'workshop_id' = v_b::text) THEN
    RAISE EXCEPTION 'F: the admins or the leader did not hear of the missing link';
  END IF;
  -- The reminder (a day before) waits for the link, then goes.
  IF EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_ref AND kind = 'reminder') THEN
    RAISE EXCEPTION 'F: the reminder went without the link';
  END IF;
  UPDATE public.workshops SET starts_at = now() + interval '20 hours', ends_at = now() + interval '22 hours' WHERE id = v_b;
  IF EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_ref AND kind = 'reminder') THEN
    RAISE EXCEPTION 'F: the reminder went without the link';
  END IF;
  INSERT INTO public.workshop_online_links (workshop_id, meeting_url) VALUES (v_b, 'https://meet.example.invalid/ws-links');
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_ref AND kind = 'reminder') THEN
    RAISE EXCEPTION 'F: the reminder did not go once the link was there';
  END IF;
  IF (SELECT meeting_url FROM public.claim_workshop_email(v_ref, 'reminder')) IS DISTINCT FROM 'https://meet.example.invalid/ws-links' THEN
    RAISE EXCEPTION 'F: the reminder did not carry the link';
  END IF;
END;
$$;

ROLLBACK;
