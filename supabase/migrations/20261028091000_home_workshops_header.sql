-- Older home_headers payloads may omit workshops and use the application's
-- default. Once saved, the header uses the same validator as other sections.
ALTER TABLE public.site_content ADD CONSTRAINT site_content_home_workshops_header
  CHECK (key <> 'home_headers' OR (
    (draft_payload IS NULL OR NOT (draft_payload ? 'workshops')
      OR private.section_header_is_valid(draft_payload -> 'workshops'))
    AND
    (published_payload IS NULL OR NOT (published_payload ? 'workshops')
      OR private.section_header_is_valid(published_payload -> 'workshops'))
  ));
