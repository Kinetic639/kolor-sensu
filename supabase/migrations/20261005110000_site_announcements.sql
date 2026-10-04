-- Announcements on the site (the admin's CMS): a narrow bar above the
-- header ("19–23.12 centrum nieczynne"), shown from one day to another,
-- both included, in the centre's time; optionally a link ("Szczegóły").
-- Where several fall on a day, the one starting latest is shown. The site
-- reads only the one shown today (current_announcement); the admins
-- manage them all.

CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  link_label text,
  link_href text,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_announcements_message_length
    CHECK (char_length(btrim(message)) BETWEEN 1 AND 200),
  CONSTRAINT site_announcements_dates CHECK (ends_on >= starts_on),
  CONSTRAINT site_announcements_link_whole
    CHECK ((link_label IS NULL) = (link_href IS NULL)),
  CONSTRAINT site_announcements_link_label_length
    CHECK (link_label IS NULL OR char_length(btrim(link_label)) BETWEEN 1 AND 40),
  CONSTRAINT site_announcements_link_href_shape
    CHECK (link_href IS NULL OR link_href ~ '^(/[^/]|/$|https://)')
);

CREATE INDEX site_announcements_dates_idx
  ON public.site_announcements (starts_on, ends_on);

CREATE TRIGGER set_site_announcements_updated_at
BEFORE UPDATE ON public.site_announcements
FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_announcements FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_announcements TO authenticated;

CREATE POLICY "Admins manage announcements"
ON public.site_announcements
FOR ALL
TO authenticated
USING (public.has_role('admin'::public.app_role))
WITH CHECK (public.has_role('admin'::public.app_role));

-- The announcement the site shows today, in the centre's time (none: no
-- bar).
CREATE FUNCTION public.current_announcement()
RETURNS TABLE(id uuid, message text, link_label text, link_href text, ends_on date)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT a.id, a.message, a.link_label, a.link_href, a.ends_on
  FROM public.site_announcements AS a
  CROSS JOIN public.center_settings AS settings
  WHERE settings.id = 1
    AND (now() AT TIME ZONE settings.timezone)::date BETWEEN a.starts_on AND a.ends_on
  ORDER BY a.starts_on DESC, a.created_at DESC
  LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.current_announcement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_announcement() TO anon, authenticated, service_role;
