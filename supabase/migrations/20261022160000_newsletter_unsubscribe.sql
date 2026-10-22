-- The newsletter's own unsubscribe page (docs/architecture/newsletter-domain.md):
-- every address gets a secret code for its unsubscribe link. Resend keeps a
-- copy of it as the contact's `unsubscribe_token` property, which each issue
-- puts into its link to /newsletter/wypisz. Unsubscribing there stops the
-- address here at once; the site's server then marks the contact
-- unsubscribed in Resend (synced_at back to null until it has).

ALTER TABLE public.newsletter_subscribers
  ADD COLUMN unsubscribe_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid();

-- Every contact already in Resend gets its code there with the next sync.
UPDATE public.newsletter_subscribers
SET synced_at = NULL
WHERE status = 'active';

CREATE INDEX newsletter_subscribers_unsynced_stops
  ON public.newsletter_subscribers (status)
  WHERE status = 'unsubscribed' AND synced_at IS NULL;

-- What the site's server has to bring to Resend: confirmed addresses not
-- copied yet ('active', with the code for their unsubscribe link),
-- addresses unsubscribed here and not yet there ('unsubscribed'), and
-- addresses to delete there ('removing').
DROP FUNCTION public.newsletter_contacts_to_sync();
CREATE FUNCTION public.newsletter_contacts_to_sync()
RETURNS TABLE (id uuid, email text, status text, unsubscribe_token uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT subscriber.id, subscriber.email, subscriber.status,
    subscriber.unsubscribe_token
  FROM public.newsletter_subscribers AS subscriber
  WHERE (subscriber.status IN ('active', 'unsubscribed')
      AND subscriber.synced_at IS NULL)
    OR subscriber.status = 'removing'
  ORDER BY subscriber.requested_at
  LIMIT 200;
$$;

-- An address brought up to date in Resend (copied there, or unsubscribed
-- there too).
CREATE OR REPLACE FUNCTION public.mark_newsletter_synced(p_id uuid, p_contact_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.newsletter_subscribers
  SET resend_contact_id = coalesce(p_contact_id, resend_contact_id),
    synced_at = now()
  WHERE id = p_id AND status IN ('active', 'unsubscribed');
$$;

-- The address behind an unsubscribe link, for the page to name it (masked
-- there) before the button: its e-mail and status; nothing for an unknown
-- code.
CREATE FUNCTION public.find_newsletter_unsubscribe(p_token uuid)
RETURNS TABLE (email text, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT subscriber.email, subscriber.status
  FROM public.newsletter_subscribers AS subscriber
  WHERE subscriber.unsubscribe_token = p_token;
$$;

-- The unsubscribe page's button: 'stopped' (the address is off the list
-- now; Resend is told next), 'already' (it was off already) or 'unknown'.
CREATE FUNCTION public.unsubscribe_newsletter(p_token uuid)
RETURNS TABLE (outcome text, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_row public.newsletter_subscribers;
BEGIN
  SELECT * INTO v_row FROM public.newsletter_subscribers AS subscriber
  WHERE subscriber.unsubscribe_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'unknown'::text, NULL::text;
    RETURN;
  END IF;
  IF v_row.status NOT IN ('pending', 'active') THEN
    RETURN QUERY SELECT 'already'::text, v_row.email;
    RETURN;
  END IF;

  UPDATE public.newsletter_subscribers
  SET status = 'unsubscribed', stopped_at = now(), stop_reason = 'unsubscribed',
    -- Resend has to hear of it only if it knows the address.
    synced_at = CASE WHEN v_row.resend_contact_id IS NULL THEN now() END
  WHERE id = v_row.id;
  RETURN QUERY SELECT 'stopped'::text, v_row.email;
END;
$$;

REVOKE ALL ON FUNCTION public.newsletter_contacts_to_sync() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_newsletter_unsubscribe(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unsubscribe_newsletter(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_contacts_to_sync() TO service_role;
GRANT EXECUTE ON FUNCTION public.find_newsletter_unsubscribe(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.unsubscribe_newsletter(uuid) TO service_role;
