BEGIN;
DO $$
DECLARE
  payload jsonb;
  header jsonb := '{"eyebrow":{"text":"Warsztaty","tone":"green"},"title":[[{"text":"Rozwijaj się","tone":"pink"}]],"description":[{"text":"Opis spotkań","link":null}],"cta":{"label":"Więcej warsztatów","href":"/warsztaty","style":"arrow"}}';
BEGIN
  SELECT draft_payload - 'workshops' INTO payload FROM public.site_content WHERE key = 'home_headers';
  IF payload IS NULL THEN RAISE EXCEPTION 'Missing home_headers fixture'; END IF;
  UPDATE public.site_content SET draft_payload = payload WHERE key = 'home_headers';
  UPDATE public.site_content SET published_payload = payload, published_at = now() WHERE key = 'home_headers';
  payload := jsonb_set(payload, '{workshops}', header);
  UPDATE public.site_content SET draft_payload = payload WHERE key = 'home_headers';
  UPDATE public.site_content SET published_payload = payload WHERE key = 'home_headers';
  payload := jsonb_set(payload, '{workshops,eyebrow,tone}', '"red"');
  BEGIN
    UPDATE public.site_content SET draft_payload = payload WHERE key = 'home_headers';
    RAISE EXCEPTION 'Invalid workshop header draft accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.site_content SET published_payload = payload WHERE key = 'home_headers';
    RAISE EXCEPTION 'Invalid workshop header publication accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END;
$$;
ROLLBACK;
