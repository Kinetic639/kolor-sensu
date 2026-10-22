-- The newsletter (20261022120000): only the site's server signs people up
-- and confirms them; a sign-up waits for its link, the link works once and
-- for 7 days; a visitor may not sign up more than five addresses an hour; an
-- unsubscribe stops an address; removing one goes through Resend unless
-- Resend cannot know it; only admins see the list and remove addresses, and
-- removing a client's data removes their address too. Everything is rolled
-- back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('5e000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'newsletter-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Newsletter","last_name":"Admin"}', now(), now(), false, false),
  ('5e000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'newsletter-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Newsletter","last_name":"Specialist"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5e000000-0000-4000-8000-000000000001', 'admin'),
  ('5e000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.clients (id, email, name)
VALUES ('5e000000-0000-4000-8000-0000000000c1', 'Klientka@Example.invalid', 'Klientka');

-- ------------------------------------------------------------ a visitor

SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.newsletter_subscribers;
    RAISE EXCEPTION 'A: a visitor read the list';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.request_newsletter_subscription(
      'ola@example.invalid', 'home', 'Zgoda', 'v1', repeat('a', 32), repeat('0', 64)
    );
    RAISE EXCEPTION 'A: a visitor called the server''s sign-up';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.confirm_newsletter_subscription(repeat('0', 64));
    RAISE EXCEPTION 'A: a visitor called the server''s confirmation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.list_newsletter_subscribers();
    RAISE EXCEPTION 'A: a visitor listed the subscribers';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the site's server

SET LOCAL ROLE service_role;

DO $$
DECLARE
  answer text;
  confirmed record;
BEGIN
  answer := public.request_newsletter_subscription(
    ' Ola@Example.invalid ', 'home', 'Chcę dostawać newsletter.', '2026-10-22',
    repeat('b', 32), repeat('1', 64)
  );
  IF answer <> 'send' THEN
    RAISE EXCEPTION 'B: a new sign-up said %', answer;
  END IF;
  IF (SELECT row(email, status, source, consent_text)::text
      FROM public.newsletter_subscribers WHERE token_hash = repeat('1', 64))
    IS DISTINCT FROM row('ola@example.invalid', 'pending', 'home',
      'Chcę dostawać newsletter.')::text THEN
    RAISE EXCEPTION 'B: the sign-up was not kept tidied, pending, with its consent';
  END IF;

  -- The link went out: a second sign-up within 10 minutes sends nothing.
  PERFORM public.mark_newsletter_confirmation_sent('ola@example.invalid');
  answer := public.request_newsletter_subscription(
    'ola@example.invalid', 'footer', 'Chcę dostawać newsletter.', '2026-10-22',
    repeat('b', 32), repeat('2', 64)
  );
  IF answer <> 'wait' THEN
    RAISE EXCEPTION 'B: a repeated sign-up within 10 minutes said %', answer;
  END IF;

  -- Not on the list (nothing to copy to Resend) before the link.
  IF EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()) THEN
    RAISE EXCEPTION 'C: an unconfirmed address was to be copied to Resend';
  END IF;

  SELECT * INTO confirmed FROM public.confirm_newsletter_subscription(repeat('9', 64));
  IF confirmed.outcome <> 'unknown' THEN
    RAISE EXCEPTION 'C: an unknown link said %', confirmed.outcome;
  END IF;

  SELECT * INTO confirmed FROM public.confirm_newsletter_subscription(repeat('1', 64));
  IF confirmed.outcome <> 'confirmed' OR confirmed.email <> 'ola@example.invalid' THEN
    RAISE EXCEPTION 'C: the link said % for %', confirmed.outcome, confirmed.email;
  END IF;
  SELECT * INTO confirmed FROM public.confirm_newsletter_subscription(repeat('1', 64));
  IF confirmed.outcome <> 'already' THEN
    RAISE EXCEPTION 'C: the link used again said %', confirmed.outcome;
  END IF;

  -- On the list: a new sign-up changes nothing.
  answer := public.request_newsletter_subscription(
    'ola@example.invalid', 'footer', 'Inna zgoda', 'v2', repeat('b', 32), repeat('3', 64)
  );
  IF answer <> 'active'
    OR (SELECT consent_version FROM public.newsletter_subscribers
        WHERE email = 'ola@example.invalid') <> '2026-10-22' THEN
    RAISE EXCEPTION 'C: a sign-up of a subscribed address changed it (%)', answer;
  END IF;

  -- Copied to Resend once.
  IF (SELECT count(*) FROM public.newsletter_contacts_to_sync()
      WHERE email = 'ola@example.invalid' AND status = 'active') <> 1 THEN
    RAISE EXCEPTION 'D: the confirmed address was not to be copied to Resend';
  END IF;
  PERFORM public.mark_newsletter_synced(
    (SELECT id FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid'),
    'contact-ola'
  );
  IF EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()) THEN
    RAISE EXCEPTION 'D: a copied address was still to be copied';
  END IF;

  -- An old link no longer works.
  PERFORM public.request_newsletter_subscription(
    'stary@example.invalid', 'home', 'Zgoda', 'v1', repeat('c', 32), repeat('4', 64)
  );
  UPDATE public.newsletter_subscribers SET requested_at = now() - interval '8 days'
  WHERE email = 'stary@example.invalid';
  SELECT * INTO confirmed FROM public.confirm_newsletter_subscription(repeat('4', 64));
  IF confirmed.outcome <> 'unknown' THEN
    RAISE EXCEPTION 'E: a link older than 7 days said %', confirmed.outcome;
  END IF;

  -- Five addresses an hour from one visitor (key b: ola, plus four more).
  PERFORM public.request_newsletter_subscription('a1@example.invalid', 'home', 'Z', 'v1', repeat('b', 32), repeat('5', 64));
  PERFORM public.request_newsletter_subscription('a2@example.invalid', 'home', 'Z', 'v1', repeat('b', 32), repeat('6', 64));
  PERFORM public.request_newsletter_subscription('a3@example.invalid', 'home', 'Z', 'v1', repeat('b', 32), repeat('7', 64));
  PERFORM public.request_newsletter_subscription('a4@example.invalid', 'home', 'Z', 'v1', repeat('b', 32), repeat('8', 64));
  BEGIN
    PERFORM public.request_newsletter_subscription('a5@example.invalid', 'home', 'Z', 'v1', repeat('b', 32), repeat('a', 64));
    RAISE EXCEPTION 'F: a sixth sign-up within the hour from one visitor was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_rate_limited' THEN RAISE; END IF;
  END;

  -- Resend says Ola unsubscribed.
  IF NOT public.stop_newsletter_subscription('OLA@example.invalid', 'unsubscribed') THEN
    RAISE EXCEPTION 'G: the unsubscribe found no address';
  END IF;
  IF (SELECT row(status, stop_reason)::text FROM public.newsletter_subscribers
      WHERE email = 'ola@example.invalid')
    IS DISTINCT FROM row('unsubscribed', 'unsubscribed')::text THEN
    RAISE EXCEPTION 'G: the unsubscribe did not stop the address';
  END IF;
  IF public.stop_newsletter_subscription('nikt@example.invalid', 'bounced') THEN
    RAISE EXCEPTION 'G: an unknown address was stopped';
  END IF;

  -- Signing up again starts over with a new consent.
  answer := public.request_newsletter_subscription(
    'ola@example.invalid', 'footer', 'Nowa zgoda', 'v2', repeat('d', 32), repeat('b', 64)
  );
  IF answer <> 'send'
    OR (SELECT row(status, consent_version, stop_reason)::text FROM public.newsletter_subscribers
        WHERE email = 'ola@example.invalid')
      IS DISTINCT FROM row('pending', 'v2', NULL::text)::text THEN
    RAISE EXCEPTION 'G: signing up again did not start over (%)', answer;
  END IF;

  -- Unconfirmed sign-ups go after 7 days: at once when Resend cannot know
  -- them, through Resend otherwise (Ola's contact is there).
  UPDATE public.newsletter_subscribers SET requested_at = now() - interval '8 days'
  WHERE email IN ('ola@example.invalid', 'a1@example.invalid');
END;
$$;

RESET ROLE;

DO $$
BEGIN
  PERFORM private.forget_stale_newsletter_signups();
  IF EXISTS (SELECT 1 FROM public.newsletter_subscribers
             WHERE email IN ('a1@example.invalid', 'stary@example.invalid')) THEN
    RAISE EXCEPTION 'H: an old unconfirmed sign-up was kept';
  END IF;
  IF (SELECT status FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid')
    IS DISTINCT FROM 'removing' THEN
    RAISE EXCEPTION 'H: an old sign-up Resend knows was not to be removed there';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE email = 'a2@example.invalid') THEN
    RAISE EXCEPTION 'H: a new sign-up was removed';
  END IF;
END;
$$;

SET LOCAL ROLE service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
                 WHERE email = 'ola@example.invalid' AND status = 'removing') THEN
    RAISE EXCEPTION 'H: the address to remove was not to be removed in Resend';
  END IF;
  PERFORM public.finish_newsletter_removal(
    (SELECT id FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid')
  );
  IF EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid') THEN
    RAISE EXCEPTION 'H: the removed address was kept';
  END IF;

  -- The client's own address, on the list.
  PERFORM public.request_newsletter_subscription(
    'klientka@example.invalid', 'home', 'Zgoda', 'v1', repeat('e', 32), repeat('c', 64)
  );
  PERFORM public.confirm_newsletter_subscription(repeat('c', 64));
  PERFORM public.mark_newsletter_synced(
    (SELECT id FROM public.newsletter_subscribers WHERE email = 'klientka@example.invalid'),
    'contact-klientka'
  );
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ a specialist

SELECT set_config('request.jwt.claims',
  '{"sub":"5e000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.list_newsletter_subscribers();
    RAISE EXCEPTION 'I: a specialist listed the subscribers';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.remove_newsletter_subscriber(
      (SELECT id FROM public.list_newsletter_subscribers() LIMIT 1)
    );
    RAISE EXCEPTION 'I: a specialist removed an address';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.stop_newsletter_subscription('a2@example.invalid', 'unsubscribed');
    RAISE EXCEPTION 'I: a signed-in user stopped an address';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the admin

-- a3 reached Resend, then unsubscribed there.
UPDATE public.newsletter_subscribers SET resend_contact_id = 'contact-a3'
WHERE email = 'a3@example.invalid';
SELECT public.stop_newsletter_subscription('a3@example.invalid', 'unsubscribed');

SELECT set_config('request.jwt.claims',
  '{"sub":"5e000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  pending_id uuid;
BEGIN
  IF (SELECT count(*) FROM public.list_newsletter_subscribers()) <> 4 THEN
    RAISE EXCEPTION 'J: the admin did not see the four addresses';
  END IF;
  IF (SELECT consent_text FROM public.get_newsletter_consent(
        (SELECT id FROM public.list_newsletter_subscribers()
         WHERE email = 'klientka@example.invalid'))) <> 'Zgoda' THEN
    RAISE EXCEPTION 'J: the admin did not see the consent given';
  END IF;

  -- Never confirmed: removed at once.
  SELECT id INTO pending_id FROM public.list_newsletter_subscribers()
  WHERE email = 'a2@example.invalid';
  PERFORM public.remove_newsletter_subscriber(pending_id);
  IF EXISTS (SELECT 1 FROM public.list_newsletter_subscribers() WHERE id = pending_id) THEN
    RAISE EXCEPTION 'J: an unconfirmed address was not removed at once';
  END IF;
  BEGIN
    PERFORM public.remove_newsletter_subscriber(pending_id);
    RAISE EXCEPTION 'J: removing a removed address passed';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;

  -- Unsubscribed, known to Resend: removed there first.
  PERFORM public.remove_newsletter_subscriber(
    (SELECT id FROM public.list_newsletter_subscribers()
     WHERE email = 'a3@example.invalid'));
  IF (SELECT row(status, stop_reason)::text FROM public.list_newsletter_subscribers()
      WHERE email = 'a3@example.invalid') IS DISTINCT FROM row('removing', NULL)::text THEN
    RAISE EXCEPTION 'J: an unsubscribed address was not to be removed in Resend';
  END IF;

  -- Removing the client's data removes their address through Resend.
  PERFORM public.forget_client('5e000000-0000-4000-8000-0000000000c1');
  IF (SELECT status FROM public.list_newsletter_subscribers()
      WHERE email = 'klientka@example.invalid') IS DISTINCT FROM 'removing' THEN
    RAISE EXCEPTION 'K: removing the client''s data kept their newsletter';
  END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  IF (SELECT forgotten_at FROM public.clients
      WHERE id = '5e000000-0000-4000-8000-0000000000c1') IS NULL THEN
    RAISE EXCEPTION 'K: the client''s data was not removed';
  END IF;
END;
$$;

ROLLBACK;
