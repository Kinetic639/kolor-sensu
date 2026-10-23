-- Kontakt's question on cancelling a visit is the centre's settings now, as
-- in Cennik (#119): the page says it from Ustawienia → Rezerwacje online
-- (48 hours unless the admin set otherwise). The CMS's starting answer,
-- "24 godziny przed spotkaniem", is taken out of the draft and the
-- published page where it was left as it was; an answer the admin wrote is
-- kept.

UPDATE public.site_content AS content SET
  draft_payload = CASE WHEN content.draft_payload ? 'faq' THEN
    jsonb_set(content.draft_payload, '{faq}', coalesce((
      SELECT jsonb_agg(item ORDER BY n)
      FROM jsonb_array_elements(content.draft_payload -> 'faq') WITH ORDINALITY AS faq(item, n)
      WHERE item ->> 'answer' <> 'Najpóźniej 24 godziny przed spotkaniem, telefonicznie lub mailowo. Wizyta odwołana później jest płatna.'
    ), '[]'::jsonb))
    ELSE content.draft_payload END,
  published_payload = CASE WHEN content.published_payload ? 'faq' THEN
    jsonb_set(content.published_payload, '{faq}', coalesce((
      SELECT jsonb_agg(item ORDER BY n)
      FROM jsonb_array_elements(content.published_payload -> 'faq') WITH ORDINALITY AS faq(item, n)
      WHERE item ->> 'answer' <> 'Najpóźniej 24 godziny przed spotkaniem, telefonicznie lub mailowo. Wizyta odwołana później jest płatna.'
    ), '[]'::jsonb))
    ELSE content.published_payload END
WHERE content.key = 'contact_page';
