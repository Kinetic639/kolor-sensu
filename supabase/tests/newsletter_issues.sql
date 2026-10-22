-- Newsletter issues (20261022140000): only admins write, list and send
-- issues; a draft is edited, a sent one is not; sending takes the draft,
-- then gives it the next number and the addresses in Resend, or gives it
-- back; a scheduled issue can be taken back before it goes; the archive
-- shows only the issues gone out and kept in it, to anyone. Sign-ups come
-- from booking and articles too. Everything is rolled back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('5e100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'issues-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Issues","last_name":"Admin"}', now(), now(), false, false),
  ('5e100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'issues-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Issues","last_name":"Specialist"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5e100000-0000-4000-8000-000000000001', 'admin'),
  ('5e100000-0000-4000-8000-000000000002', 'specialist');

-- Two addresses in Resend, one waiting, one from booking and one from an
-- article (the new sources).
INSERT INTO public.newsletter_subscribers (
  email, status, source, consent_text, consent_version, sender_key,
  token_hash, confirmed_at, resend_contact_id, synced_at
)
VALUES
  ('i1@example.invalid', 'active', 'booking', 'Z', 'v1', repeat('a', 32),
    repeat('1', 64), now(), 'c-1', now()),
  ('i2@example.invalid', 'active', 'article', 'Z', 'v1', repeat('a', 32),
    repeat('2', 64), now(), 'c-2', now()),
  ('i3@example.invalid', 'pending', 'home', 'Z', 'v1', repeat('a', 32),
    repeat('3', 64), NULL, NULL, NULL);

-- ------------------------------------------------------------ outsiders

SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.newsletter_issues;
    RAISE EXCEPTION 'A: a visitor read the issues';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.create_newsletter_issue();
    RAISE EXCEPTION 'A: a visitor created an issue';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT count(*) FROM public.list_newsletter_archive()) <> 0 THEN
    RAISE EXCEPTION 'A: the archive showed something before any issue';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"5e100000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.create_newsletter_issue();
    RAISE EXCEPTION 'B: a specialist created an issue';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.list_newsletter_issues();
    RAISE EXCEPTION 'B: a specialist listed the issues';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"5e100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  first_id uuid;
  second_id uuid;
  third_id uuid;
  doc jsonb := '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Cześć"}]}]}';
  issue record;
  numbered integer;
BEGIN
  first_id := public.create_newsletter_issue();

  -- C: a draft is saved; one without a subject is not sent.
  BEGIN
    PERFORM public.claim_newsletter_issue(first_id, NULL);
    RAISE EXCEPTION 'C: an issue without a subject was taken to send';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_incomplete:subject' THEN RAISE; END IF;
  END;
  PERFORM public.save_newsletter_issue(first_id, '  Październik  ', 'Co nowego',
    doc, '[{"kind":"article","id":"x"}]', doc, true);
  SELECT * INTO issue FROM public.get_newsletter_issue(first_id);
  IF issue.subject <> 'Październik' OR jsonb_array_length(issue.items) <> 1
     OR issue.status <> 'draft' THEN
    RAISE EXCEPTION 'C: the draft was not saved as written';
  END IF;

  -- D: a time gone by is refused; sending now takes the draft, which then
  -- cannot be edited, sent or deleted meanwhile.
  BEGIN
    PERFORM public.claim_newsletter_issue(first_id, now() - interval '1 hour');
    RAISE EXCEPTION 'D: a time in the past was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_time_past' THEN RAISE; END IF;
  END;
  PERFORM public.claim_newsletter_issue(first_id, NULL);
  BEGIN
    PERFORM public.save_newsletter_issue(first_id, 'Inny', '', doc, '[]', doc, true);
    RAISE EXCEPTION 'D: an issue being sent was edited';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_not_draft' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.claim_newsletter_issue(first_id, NULL);
    RAISE EXCEPTION 'D: an issue was taken to send twice';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_not_draft' THEN RAISE; END IF;
  END;

  -- E: Resend refused: the draft comes back as it was.
  PERFORM public.release_newsletter_issue(first_id);
  SELECT * INTO issue FROM public.get_newsletter_issue(first_id);
  IF issue.status <> 'draft' OR issue.send_at IS NOT NULL THEN
    RAISE EXCEPTION 'E: a refused issue did not come back as a draft';
  END IF;

  -- F: sent: number 1, the two addresses in Resend (not the waiting one).
  PERFORM public.claim_newsletter_issue(first_id, NULL);
  numbered := public.finish_newsletter_issue(first_id, 'b-1');
  SELECT * INTO issue FROM public.get_newsletter_issue(first_id);
  IF numbered <> 1 OR issue.number <> 1 OR issue.recipients <> 2
     OR issue.broadcast_id <> 'b-1' OR issue.status <> 'sent' THEN
    RAISE EXCEPTION 'F: the sent issue was not numbered and counted';
  END IF;
  BEGIN
    PERFORM public.delete_newsletter_issue(first_id);
    RAISE EXCEPTION 'F: a sent issue was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_not_draft' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.unschedule_newsletter_issue(first_id);
    RAISE EXCEPTION 'F: an issue gone out was taken back';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'newsletter_issue_not_scheduled' THEN RAISE; END IF;
  END;

  -- G: a second one scheduled for tomorrow gets number 2, then is taken
  -- back: a draft again, without its number.
  second_id := public.create_newsletter_issue();
  PERFORM public.save_newsletter_issue(second_id, 'Listopad', '', doc, '[]', doc, false);
  PERFORM public.claim_newsletter_issue(second_id, now() + interval '1 day');
  IF public.finish_newsletter_issue(second_id, 'b-2') <> 2 THEN
    RAISE EXCEPTION 'G: the scheduled issue was not number 2';
  END IF;
  PERFORM public.unschedule_newsletter_issue(second_id);
  SELECT * INTO issue FROM public.get_newsletter_issue(second_id);
  IF issue.status <> 'draft' OR issue.number IS NOT NULL OR issue.broadcast_id IS NOT NULL THEN
    RAISE EXCEPTION 'G: the taken back issue was not a draft again';
  END IF;

  -- H: the list: drafts first, then what went out, with its stops after it.
  IF (SELECT count(*) FROM public.list_newsletter_issues()) <> 2 THEN
    RAISE EXCEPTION 'H: the admin did not see both issues';
  END IF;
  IF (SELECT id FROM public.list_newsletter_issues() LIMIT 1) <> second_id THEN
    RAISE EXCEPTION 'H: the draft was not first';
  END IF;

  -- I: a draft is deleted; an unknown one is not found.
  third_id := public.create_newsletter_issue();
  PERFORM public.delete_newsletter_issue(third_id);
  BEGIN
    PERFORM public.delete_newsletter_issue(third_id);
    RAISE EXCEPTION 'I: deleting a deleted issue passed';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- An address stops after issue 1 went out (an hour ago, say).
UPDATE public.newsletter_issues SET send_at = now() - interval '1 hour'
WHERE number = 1;
UPDATE public.newsletter_subscribers
SET status = 'unsubscribed', stopped_at = now(), stop_reason = 'unsubscribed'
WHERE email = 'i2@example.invalid';

SELECT set_config('request.jwt.claims',
  '{"sub":"5e100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT stopped_after FROM public.list_newsletter_issues() WHERE number = 1) <> 1 THEN
    RAISE EXCEPTION 'J: the stop after issue 1 was not counted';
  END IF;
  IF (SELECT stopped_after FROM public.list_newsletter_issues() WHERE number IS NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'J: a draft had stops';
  END IF;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the archive

SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.list_newsletter_archive()) <> 1
     OR (SELECT number FROM public.list_newsletter_archive()) <> 1 THEN
    RAISE EXCEPTION 'K: the archive did not show issue 1 alone';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"5e100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

SELECT public.set_newsletter_issue_archive(
  (SELECT id FROM public.list_newsletter_issues() WHERE number = 1), false);

RESET ROLE;
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.list_newsletter_archive()) <> 0 THEN
    RAISE EXCEPTION 'K: an issue taken out of the archive still showed';
  END IF;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ sources

DO $$
BEGIN
  BEGIN
    INSERT INTO public.newsletter_subscribers (
      email, source, consent_text, consent_version, sender_key, token_hash
    ) VALUES ('i9@example.invalid', 'popup', 'Z', 'v1', repeat('a', 32), repeat('9', 64));
    RAISE EXCEPTION 'L: an unknown source was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

ROLLBACK;
