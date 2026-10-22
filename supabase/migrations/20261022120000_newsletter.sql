-- The newsletter (docs/architecture/newsletter-domain.md): the list of
-- subscribers and their consents lives here; Resend sends the newsletter to
-- a copy of it (its contacts).
--
--   newsletter_subscribers  one row per address: written only by the site's
--                           server (service_role) and, for removals, by the
--                           admin through functions; nobody reads it directly.
--
-- A sign-up is 'pending' until the link in the e-mail confirms it ('active');
-- the site's server then copies it to Resend (synced_at). An unsubscribe,
-- bounce or spam complaint, reported by Resend's webhook, stops it
-- ('unsubscribed'). Removing an address that Resend may know marks it
-- 'removing': the site's server deletes the contact in Resend, then the row.
-- Unconfirmed sign-ups go after 7 days.

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (
    email = lower(btrim(email))
    AND char_length(email) <= 254
    AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'unsubscribed', 'removing')),
  -- Where the latest sign-up came from.
  source text NOT NULL CHECK (source IN ('home', 'footer')),
  -- The consent as the person saw it, and its version: the proof of consent.
  consent_text text NOT NULL CHECK (char_length(consent_text) BETWEEN 1 AND 1000),
  consent_version text NOT NULL CHECK (char_length(consent_version) BETWEEN 1 AND 40),
  -- A keyed hash of the sign-up's IP address (never the address itself),
  -- for the limit on sign-ups.
  sender_key text NOT NULL CHECK (char_length(sender_key) BETWEEN 16 AND 128),
  -- The SHA-256 of the confirmation link's token (the token itself is only
  -- in the e-mail).
  token_hash text NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  requested_at timestamptz NOT NULL DEFAULT now(),
  confirmation_sent_at timestamptz,
  confirmed_at timestamptz,
  stopped_at timestamptz,
  stop_reason text CHECK (stop_reason IN ('unsubscribed', 'bounced', 'complained')),
  -- The contact in Resend, once copied there, and when it was last brought
  -- up to date (null: to do).
  resend_contact_id text CHECK (resend_contact_id IS NULL OR char_length(resend_contact_id) <= 100),
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_subscribers_active_confirmed CHECK (
    status <> 'active' OR confirmed_at IS NOT NULL
  ),
  CONSTRAINT newsletter_subscribers_stopped_whole CHECK (
    (status = 'unsubscribed') = (stopped_at IS NOT NULL AND stop_reason IS NOT NULL)
  )
);

CREATE INDEX newsletter_subscribers_sender_recent
  ON public.newsletter_subscribers (sender_key, requested_at DESC);
CREATE INDEX newsletter_subscribers_to_sync
  ON public.newsletter_subscribers (status)
  WHERE synced_at IS NULL OR status = 'removing';

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;

-- ------------------------------------------------------------ signing up

-- A sign-up from the site: 'send' (send the confirmation link with this
-- token), 'wait' (a link went to this address in the last 10 minutes, or it
-- is being removed: nothing to send) or 'active' (already subscribed:
-- nothing changes). Refuses a sixth sign-up within an hour from one visitor
-- (SQLSTATE P0001, 'newsletter_rate_limited').
CREATE OR REPLACE FUNCTION public.request_newsletter_subscription(
  p_email text,
  p_source text,
  p_consent_text text,
  p_consent_version text,
  p_sender_key text,
  p_token_hash text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_email text := lower(btrim(p_email));
  v_row public.newsletter_subscribers;
BEGIN
  IF (
    SELECT count(*) FROM public.newsletter_subscribers
    WHERE sender_key = p_sender_key
      AND requested_at > now() - interval '1 hour'
  ) >= 5 THEN
    RAISE EXCEPTION 'newsletter_rate_limited';
  END IF;

  SELECT * INTO v_row FROM public.newsletter_subscribers
  WHERE email = v_email
  FOR UPDATE;

  IF FOUND THEN
    IF v_row.status = 'active' THEN
      RETURN 'active';
    END IF;
    IF v_row.status = 'removing'
      OR (v_row.status = 'pending'
        AND v_row.confirmation_sent_at > now() - interval '10 minutes') THEN
      RETURN 'wait';
    END IF;
  END IF;

  INSERT INTO public.newsletter_subscribers (
    email, status, source, consent_text, consent_version, sender_key, token_hash
  )
  VALUES (
    v_email, 'pending', p_source, p_consent_text, p_consent_version,
    p_sender_key, p_token_hash
  )
  ON CONFLICT (email) DO UPDATE SET
    status = 'pending',
    source = excluded.source,
    consent_text = excluded.consent_text,
    consent_version = excluded.consent_version,
    sender_key = excluded.sender_key,
    token_hash = excluded.token_hash,
    requested_at = now(),
    confirmation_sent_at = NULL,
    confirmed_at = NULL,
    stopped_at = NULL,
    stop_reason = NULL,
    synced_at = NULL;
  RETURN 'send';
END;
$$;

-- Records that the confirmation link went out (the e-mail was accepted).
CREATE OR REPLACE FUNCTION public.mark_newsletter_confirmation_sent(p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.newsletter_subscribers
  SET confirmation_sent_at = now()
  WHERE email = lower(btrim(p_email)) AND status = 'pending';
$$;

-- The confirmation link: 'confirmed' (the address is now on the list),
-- 'already' (it was confirmed before) or 'unknown' (no such link, or it is
-- older than 7 days). The address comes back for copying it to Resend.
CREATE OR REPLACE FUNCTION public.confirm_newsletter_subscription(p_token_hash text)
RETURNS TABLE (outcome text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_row public.newsletter_subscribers;
BEGIN
  SELECT * INTO v_row FROM public.newsletter_subscribers AS subscriber
  WHERE subscriber.token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'unknown'::text, NULL::text;
    RETURN;
  END IF;
  IF v_row.status = 'active' THEN
    RETURN QUERY SELECT 'already'::text, v_row.email;
    RETURN;
  END IF;
  IF v_row.status <> 'pending' OR v_row.requested_at <= now() - interval '7 days' THEN
    RETURN QUERY SELECT 'unknown'::text, NULL::text;
    RETURN;
  END IF;

  UPDATE public.newsletter_subscribers
  SET status = 'active', confirmed_at = now(), synced_at = NULL
  WHERE id = v_row.id;
  RETURN QUERY SELECT 'confirmed'::text, v_row.email;
END;
$$;

-- ------------------------------------------------------------ Resend

-- What the site's server has to bring to Resend: confirmed addresses not
-- copied yet ('active'), and addresses to delete there ('removing').
CREATE OR REPLACE FUNCTION public.newsletter_contacts_to_sync()
RETURNS TABLE (id uuid, email text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT subscriber.id, subscriber.email, subscriber.status
  FROM public.newsletter_subscribers AS subscriber
  WHERE (subscriber.status = 'active' AND subscriber.synced_at IS NULL)
    OR subscriber.status = 'removing'
  ORDER BY subscriber.requested_at
  LIMIT 200;
$$;

-- An address copied to Resend as its contact.
CREATE OR REPLACE FUNCTION public.mark_newsletter_synced(p_id uuid, p_contact_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.newsletter_subscribers
  SET resend_contact_id = p_contact_id, synced_at = now()
  WHERE id = p_id AND status = 'active';
$$;

-- An address deleted in Resend: the row goes too.
CREATE OR REPLACE FUNCTION public.finish_newsletter_removal(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  DELETE FROM public.newsletter_subscribers
  WHERE id = p_id AND status = 'removing';
$$;

-- Resend says the address stopped: an unsubscribe, a hard bounce or a spam
-- complaint. True when it was on the list (or waiting for confirmation).
CREATE OR REPLACE FUNCTION public.stop_newsletter_subscription(p_email text, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.newsletter_subscribers
  SET status = 'unsubscribed', stopped_at = now(), stop_reason = p_reason
  WHERE email = lower(btrim(p_email)) AND status IN ('pending', 'active');
  RETURN FOUND;
END;
$$;

-- ------------------------------------------------------------ removing

-- Removes one address: at once when Resend cannot know it (never
-- confirmed), else after its contact is deleted there ('removing').
CREATE OR REPLACE FUNCTION private.remove_newsletter_address(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.newsletter_subscribers
  WHERE id = p_id AND status = 'pending' AND resend_contact_id IS NULL;
  IF NOT FOUND THEN
    -- An unsubscribed address goes too; why it stopped goes with it.
    UPDATE public.newsletter_subscribers
    SET status = 'removing', stopped_at = NULL, stop_reason = NULL
    WHERE id = p_id;
  END IF;
END;
$$;

-- Sign-ups not confirmed within 7 days.
CREATE OR REPLACE FUNCTION private.forget_stale_newsletter_signups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_id IN
    SELECT id FROM public.newsletter_subscribers
    WHERE status = 'pending' AND requested_at < now() - interval '7 days'
  LOOP
    PERFORM private.remove_newsletter_address(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ------------------------------------------------------------ the admin

-- The list for Newsletter in the admin's portal, newest first.
CREATE OR REPLACE FUNCTION public.list_newsletter_subscribers()
RETURNS TABLE (
  id uuid,
  email text,
  status text,
  source text,
  consent_version text,
  requested_at timestamptz,
  confirmed_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  synced boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT subscriber.id, subscriber.email, subscriber.status, subscriber.source,
    subscriber.consent_version, subscriber.requested_at, subscriber.confirmed_at,
    subscriber.stopped_at, subscriber.stop_reason,
    subscriber.synced_at IS NOT NULL
  FROM public.newsletter_subscribers AS subscriber
  ORDER BY subscriber.requested_at DESC;
END;
$$;

-- One address, with the consent it gave (for a request to see one's data).
CREATE OR REPLACE FUNCTION public.get_newsletter_consent(p_id uuid)
RETURNS TABLE (email text, consent_text text, consent_version text, requested_at timestamptz, confirmed_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT subscriber.email, subscriber.consent_text, subscriber.consent_version,
    subscriber.requested_at, subscriber.confirmed_at
  FROM public.newsletter_subscribers AS subscriber
  WHERE subscriber.id = p_id;
END;
$$;

-- The admin removes an address (a request to delete one's data).
CREATE OR REPLACE FUNCTION public.remove_newsletter_subscriber(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE id = p_id) THEN
    RAISE EXCEPTION 'No such subscriber.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  PERFORM private.remove_newsletter_address(p_id);
END;
$$;

-- Removing a client's data on request (Klienci → Usuń dane) removes their
-- address from the newsletter too. The nightly retention does not: the
-- newsletter is its own consent, not part of the visits.
CREATE OR REPLACE FUNCTION public.forget_client(p_client uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_subscriber uuid;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only an admin may do this.'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client) THEN
    RAISE EXCEPTION 'No such client.' USING ERRCODE = 'P0002', HINT = 'not_found';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id = p_client AND forgotten_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Already removed.' USING ERRCODE = 'P0001', HINT = 'already_forgotten';
  END IF;
  IF private.client_has_open_business(p_client) THEN
    RAISE EXCEPTION 'A visit to come or money owed.'
      USING ERRCODE = 'P0001', HINT = 'client_busy';
  END IF;
  SELECT subscriber.id INTO v_subscriber
  FROM public.newsletter_subscribers AS subscriber
  JOIN public.clients AS client ON client.email_key = subscriber.email
  WHERE client.id = p_client;
  IF v_subscriber IS NOT NULL THEN
    PERFORM private.remove_newsletter_address(v_subscriber);
  END IF;
  PERFORM private.forget_client_data(p_client);
END;
$$;

-- ------------------------------------------------------------ the schedule

-- Calls the site, which brings Resend up to date (/api/cron/newsletter),
-- with the same Vault secrets as the payment e-mails.
CREATE OR REPLACE FUNCTION private.request_newsletter_sync()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets WHERE name = 'site_url';
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets WHERE name = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN net.http_get(
    url := rtrim(v_url, '/') || '/api/cron/newsletter',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  );
END;
$$;

SELECT cron.schedule(
  'forget-stale-newsletter-signups', '41 * * * *',
  'SELECT private.forget_stale_newsletter_signups()'
);
SELECT cron.schedule(
  'newsletter-sync', '*/10 * * * *',
  'SELECT private.request_newsletter_sync()'
);

-- ------------------------------------------------------------ grants

REVOKE ALL ON FUNCTION public.request_newsletter_subscription(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_newsletter_confirmation_sent(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_newsletter_subscription(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.newsletter_contacts_to_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_newsletter_synced(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_newsletter_removal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stop_newsletter_subscription(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_newsletter_subscription(text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_newsletter_confirmation_sent(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_newsletter_subscription(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.newsletter_contacts_to_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_newsletter_synced(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_newsletter_removal(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.stop_newsletter_subscription(text, text) TO service_role;

REVOKE ALL ON FUNCTION public.list_newsletter_subscribers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_newsletter_consent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_newsletter_subscriber(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_newsletter_subscribers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_newsletter_consent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_newsletter_subscriber(uuid) TO authenticated;

REVOKE ALL ON FUNCTION private.remove_newsletter_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.forget_stale_newsletter_signups() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.request_newsletter_sync() FROM PUBLIC;
