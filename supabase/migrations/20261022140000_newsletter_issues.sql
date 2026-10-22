-- The newsletter, stage 2 and 3 (docs/architecture/newsletter-domain.md):
-- issues written in the admin's portal and sent through Resend, and new
-- places to sign up (booking a visit, under an article, the archive).
--
--   newsletter_issues  one row per issue: a draft the admin writes, then
--                      handed to Resend (now or at a chosen time). Read and
--                      written only through the functions below; the
--                      public archive reads the issues sent and kept in it.
--
-- An issue is 'draft' while it is written; 'sending' while the site's
-- server hands it to Resend (as the admin who asked); 'sent' once Resend
-- has it, with when it goes (send_at, which may be ahead: scheduled) and
-- its number. A scheduled issue can be taken back to a draft until then.

-- ------------------------------------------------------------ sign-ups

ALTER TABLE public.newsletter_subscribers
  DROP CONSTRAINT newsletter_subscribers_source_check;
ALTER TABLE public.newsletter_subscribers
  ADD CONSTRAINT newsletter_subscribers_source_check
  CHECK (source IN ('home', 'footer', 'booking', 'article', 'archive'));

-- ------------------------------------------------------------ issues

CREATE TABLE public.newsletter_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The issue's number, given when it is handed to Resend.
  number integer UNIQUE CHECK (number IS NULL OR number > 0),
  subject text NOT NULL DEFAULT '' CHECK (char_length(subject) <= 150),
  preview_text text NOT NULL DEFAULT '' CHECK (char_length(preview_text) <= 200),
  -- Rich text (the base profile); checked whole by the contracts on save.
  intro jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    CHECK (jsonb_typeof(intro) = 'object' AND intro->>'type' = 'doc'),
  -- What the issue points to, in order: articles, e-books, own cards.
  items jsonb NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 12),
  closing jsonb NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    CHECK (jsonb_typeof(closing) = 'object' AND closing->>'type' = 'doc'),
  -- Shown in the site's archive (/newsletter) once sent.
  in_archive boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent')),
  send_at timestamptz,
  broadcast_id text CHECK (broadcast_id IS NULL OR char_length(broadcast_id) <= 100),
  -- The addresses in Resend when it was handed over.
  recipients integer CHECK (recipients IS NULL OR recipients >= 0),
  sent_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletter_issues_sent_whole CHECK (
    (status = 'sent') = (number IS NOT NULL AND send_at IS NOT NULL
      AND broadcast_id IS NOT NULL AND recipients IS NOT NULL)
  )
);

ALTER TABLE public.newsletter_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_issues FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_issues FROM PUBLIC, anon, authenticated;

-- Every issue, newest first, with how many stopped the newsletter after it
-- went (until the next issue).
CREATE OR REPLACE FUNCTION public.list_newsletter_issues()
RETURNS TABLE (
  id uuid,
  number integer,
  subject text,
  status text,
  send_at timestamptz,
  recipients integer,
  stopped_after integer,
  in_archive boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT issue.id, issue.number, issue.subject, issue.status, issue.send_at,
    issue.recipients,
    CASE WHEN issue.status = 'sent' AND issue.send_at <= now() THEN (
      SELECT count(*)::integer
      FROM public.newsletter_subscribers AS subscriber
      WHERE subscriber.stopped_at >= issue.send_at
        AND subscriber.stopped_at < coalesce((
          SELECT min(later.send_at) FROM public.newsletter_issues AS later
          WHERE later.status = 'sent' AND later.send_at > issue.send_at
        ), 'infinity'::timestamptz)
    ) END,
    issue.in_archive, issue.updated_at
  FROM public.newsletter_issues AS issue
  ORDER BY (issue.status = 'draft') DESC, coalesce(issue.send_at, issue.updated_at) DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_newsletter_issue(p_id uuid)
RETURNS TABLE (
  id uuid,
  number integer,
  subject text,
  preview_text text,
  intro jsonb,
  items jsonb,
  closing jsonb,
  in_archive boolean,
  status text,
  send_at timestamptz,
  broadcast_id text,
  recipients integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  RETURN QUERY
  SELECT issue.id, issue.number, issue.subject, issue.preview_text, issue.intro,
    issue.items, issue.closing, issue.in_archive, issue.status, issue.send_at,
    issue.broadcast_id, issue.recipients, issue.updated_at
  FROM public.newsletter_issues AS issue
  WHERE issue.id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_newsletter_issue()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM private.require_admin();
  INSERT INTO public.newsletter_issues DEFAULT VALUES RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- A draft's content; an issue already handed to Resend keeps its words.
CREATE OR REPLACE FUNCTION public.save_newsletter_issue(
  p_id uuid,
  p_subject text,
  p_preview_text text,
  p_intro jsonb,
  p_items jsonb,
  p_closing jsonb,
  p_in_archive boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_status text;
BEGIN
  PERFORM private.require_admin();
  SELECT status INTO v_status FROM public.newsletter_issues WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'newsletter_issue_not_draft' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.newsletter_issues
  SET subject = btrim(p_subject), preview_text = btrim(p_preview_text),
    intro = p_intro, items = p_items, closing = p_closing,
    in_archive = p_in_archive, updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Whether a sent issue shows in the site's archive.
CREATE OR REPLACE FUNCTION public.set_newsletter_issue_archive(p_id uuid, p_in_archive boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.newsletter_issues
  SET in_archive = p_in_archive, updated_at = now()
  WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_newsletter_issue(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  DELETE FROM public.newsletter_issues WHERE id = p_id AND status = 'draft';
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.newsletter_issues WHERE id = p_id) THEN
      RAISE EXCEPTION 'newsletter_issue_not_draft' USING ERRCODE = 'P0001';
    END IF;
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

-- Sending, step 1: the draft is taken (nobody edits or sends it twice
-- meanwhile). A subject is needed; the time, if any, is ahead.
CREATE OR REPLACE FUNCTION public.claim_newsletter_issue(p_id uuid, p_send_at timestamptz)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_issue public.newsletter_issues;
BEGIN
  PERFORM private.require_admin();
  SELECT * INTO v_issue FROM public.newsletter_issues WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_issue.status <> 'draft' THEN
    RAISE EXCEPTION 'newsletter_issue_not_draft' USING ERRCODE = 'P0001';
  END IF;
  IF v_issue.subject = '' THEN
    RAISE EXCEPTION 'newsletter_issue_incomplete:subject' USING ERRCODE = 'P0001';
  END IF;
  IF p_send_at IS NOT NULL AND p_send_at < now() THEN
    RAISE EXCEPTION 'newsletter_issue_time_past' USING ERRCODE = 'P0001';
  END IF;
  UPDATE public.newsletter_issues
  SET status = 'sending', send_at = coalesce(p_send_at, now()),
    sent_by = auth.uid(), updated_at = now()
  WHERE id = p_id;
END;
$$;

-- Sending, step 2: Resend has it. It gets the next number, and how many
-- addresses Resend held then.
CREATE OR REPLACE FUNCTION public.finish_newsletter_issue(p_id uuid, p_broadcast_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_number integer;
BEGIN
  PERFORM private.require_admin();
  LOCK TABLE public.newsletter_issues IN SHARE ROW EXCLUSIVE MODE;
  SELECT coalesce(max(number), 0) + 1 INTO v_number FROM public.newsletter_issues;
  UPDATE public.newsletter_issues
  SET status = 'sent', number = v_number, broadcast_id = p_broadcast_id,
    recipients = (
      SELECT count(*) FROM public.newsletter_subscribers
      WHERE status = 'active' AND resend_contact_id IS NOT NULL
    ),
    updated_at = now()
  WHERE id = p_id AND status = 'sending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'newsletter_issue_not_sending' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_number;
END;
$$;

-- Sending failed (Resend refused it): back to the draft, as it was.
CREATE OR REPLACE FUNCTION public.release_newsletter_issue(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.newsletter_issues
  SET status = 'draft', send_at = NULL, sent_by = NULL, updated_at = now()
  WHERE id = p_id AND status = 'sending';
END;
$$;

-- A scheduled issue taken back (after Resend cancelled it): a draft again,
-- without its number.
CREATE OR REPLACE FUNCTION public.unschedule_newsletter_issue(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_admin();
  UPDATE public.newsletter_issues
  SET status = 'draft', number = NULL, send_at = NULL, broadcast_id = NULL,
    recipients = NULL, sent_by = NULL, updated_at = now()
  WHERE id = p_id AND status = 'sent' AND send_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'newsletter_issue_not_scheduled' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- ------------------------------------------------------------ the archive

-- The issues gone out and kept in the archive, newest first (anyone).
CREATE OR REPLACE FUNCTION public.list_newsletter_archive()
RETURNS TABLE (
  number integer,
  subject text,
  preview_text text,
  intro jsonb,
  items jsonb,
  closing jsonb,
  send_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT issue.number, issue.subject, issue.preview_text, issue.intro,
    issue.items, issue.closing, issue.send_at
  FROM public.newsletter_issues AS issue
  WHERE issue.status = 'sent' AND issue.in_archive AND issue.send_at <= now()
  ORDER BY issue.send_at DESC;
$$;

-- ------------------------------------------------------------ grants

REVOKE ALL ON FUNCTION public.list_newsletter_issues() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_newsletter_issue(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_newsletter_issue() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_newsletter_issue(uuid, text, text, jsonb, jsonb, jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_newsletter_issue_archive(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_newsletter_issue(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_newsletter_issue(uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finish_newsletter_issue(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.release_newsletter_issue(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unschedule_newsletter_issue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_newsletter_issues() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_newsletter_issue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_newsletter_issue() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_newsletter_issue(uuid, text, text, jsonb, jsonb, jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_newsletter_issue_archive(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_newsletter_issue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_newsletter_issue(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_newsletter_issue(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_newsletter_issue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unschedule_newsletter_issue(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.list_newsletter_archive() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_newsletter_archive() TO anon, authenticated, service_role;
