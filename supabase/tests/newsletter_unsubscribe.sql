-- The newsletter's own unsubscribe page (20261022160000): every address has
-- a code; the code names the address and takes it off the list once; Resend
-- hears of it through the sync (only when it knows the address); a visitor
-- or a signed-in user cannot call any of it. Everything is rolled back at
-- the end.

BEGIN;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_code uuid;
  v_other uuid;
  found_row record;
  result record;
BEGIN
  -- Two confirmed addresses: one copied to Resend, one not yet.
  PERFORM public.request_newsletter_subscription(
    'ola@example.invalid', 'home', 'Zgoda', 'v1', repeat('a', 32), repeat('1', 64)
  );
  PERFORM public.confirm_newsletter_subscription(repeat('1', 64));
  PERFORM public.request_newsletter_subscription(
    'ewa@example.invalid', 'article', 'Zgoda', 'v1', repeat('b', 32), repeat('2', 64)
  );
  PERFORM public.confirm_newsletter_subscription(repeat('2', 64));

  SELECT unsubscribe_token INTO v_code FROM public.newsletter_subscribers
  WHERE email = 'ola@example.invalid';
  SELECT unsubscribe_token INTO v_other FROM public.newsletter_subscribers
  WHERE email = 'ewa@example.invalid';
  IF v_code IS NULL OR v_code = v_other THEN
    RAISE EXCEPTION 'A: every address needs its own code';
  END IF;

  -- The sync carries the code to Resend.
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
                 WHERE email = 'ola@example.invalid' AND status = 'active'
                   AND unsubscribe_token = v_code) THEN
    RAISE EXCEPTION 'A: the sync did not carry the code';
  END IF;
  PERFORM public.mark_newsletter_synced(
    (SELECT id FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid'),
    'contact-ola'
  );

  -- The page names the address behind a code; nothing for an unknown one.
  SELECT * INTO found_row FROM public.find_newsletter_unsubscribe(v_code);
  IF found_row.email <> 'ola@example.invalid' OR found_row.status <> 'active' THEN
    RAISE EXCEPTION 'B: the code named % (%)', found_row.email, found_row.status;
  END IF;
  IF EXISTS (SELECT 1 FROM public.find_newsletter_unsubscribe(gen_random_uuid())) THEN
    RAISE EXCEPTION 'B: an unknown code named an address';
  END IF;

  -- The button: off the list here at once, then Resend is to hear of it.
  SELECT * INTO result FROM public.unsubscribe_newsletter(gen_random_uuid());
  IF result.outcome <> 'unknown' THEN
    RAISE EXCEPTION 'C: an unknown code said %', result.outcome;
  END IF;
  SELECT * INTO result FROM public.unsubscribe_newsletter(v_code);
  IF result.outcome <> 'stopped' OR result.email <> 'ola@example.invalid' THEN
    RAISE EXCEPTION 'C: the code said % for %', result.outcome, result.email;
  END IF;
  IF (SELECT status || '/' || stop_reason FROM public.newsletter_subscribers
      WHERE email = 'ola@example.invalid') <> 'unsubscribed/unsubscribed' THEN
    RAISE EXCEPTION 'C: the address was not stopped as unsubscribed';
  END IF;
  SELECT * INTO result FROM public.unsubscribe_newsletter(v_code);
  IF result.outcome <> 'already' THEN
    RAISE EXCEPTION 'C: the code used again said %', result.outcome;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
                 WHERE email = 'ola@example.invalid' AND status = 'unsubscribed') THEN
    RAISE EXCEPTION 'D: Resend was not to hear of the unsubscribe';
  END IF;
  PERFORM public.mark_newsletter_synced(
    (SELECT id FROM public.newsletter_subscribers WHERE email = 'ola@example.invalid'),
    NULL
  );
  IF EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
             WHERE email = 'ola@example.invalid') THEN
    RAISE EXCEPTION 'D: an unsubscribe Resend heard of was still to sync';
  END IF;
  IF (SELECT resend_contact_id FROM public.newsletter_subscribers
      WHERE email = 'ola@example.invalid') <> 'contact-ola' THEN
    RAISE EXCEPTION 'D: marking the unsubscribe lost the contact id';
  END IF;

  -- An address Resend never knew: nothing to tell it.
  PERFORM public.unsubscribe_newsletter(v_other);
  IF EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
             WHERE email = 'ewa@example.invalid') THEN
    RAISE EXCEPTION 'E: Resend was to hear of an address it never knew';
  END IF;

  -- Signing up again: back on the list after the new link, same code.
  PERFORM public.request_newsletter_subscription(
    'ola@example.invalid', 'footer', 'Zgoda', 'v1', repeat('a', 32), repeat('3', 64)
  );
  PERFORM public.confirm_newsletter_subscription(repeat('3', 64));
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_contacts_to_sync()
                 WHERE email = 'ola@example.invalid' AND status = 'active'
                   AND unsubscribe_token = v_code) THEN
    RAISE EXCEPTION 'F: a new sign-up was not to be copied to Resend again';
  END IF;
END;
$$;

-- ------------------------------------------------------------ others

SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM public.unsubscribe_newsletter(gen_random_uuid());
    RAISE EXCEPTION 'G: a visitor called unsubscribe_newsletter directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.find_newsletter_unsubscribe(gen_random_uuid());
    RAISE EXCEPTION 'G: a visitor called find_newsletter_unsubscribe directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.newsletter_contacts_to_sync();
    RAISE EXCEPTION 'G: a signed-in user read what to sync';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

ROLLBACK;
