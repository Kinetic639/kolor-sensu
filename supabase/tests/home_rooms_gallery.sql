BEGIN;
DO $$
DECLARE
  legacy jsonb;
  valid jsonb := '{"visible":true,"source":"manual","photos":[{"source":"upload","imagePath":"rooms/own.webp","imageAlt":"Fotel","caption":"Spokojna przestrzeń","description":"Ciepłe światło"}]}';
  payload jsonb;
  invalid jsonb;
BEGIN
  SELECT draft_payload - 'roomsPeek' INTO legacy FROM public.site_content WHERE key='home_sections';
  IF legacy IS NULL OR NOT private.home_rooms_gallery_is_valid(legacy) THEN RAISE EXCEPTION 'Legacy home content must remain valid'; END IF;
  payload := jsonb_set(legacy, '{roomsPeek}', valid);
  UPDATE public.site_content SET draft_payload=payload WHERE key='home_sections';
  UPDATE public.site_content SET published_payload=payload, published_at=now() WHERE key='home_sections';
  FOR invalid IN SELECT value FROM jsonb_array_elements('[null,{}, {"visible":true,"source":"unknown","photos":[]}, {"visible":true,"source":"manual","photos":[{}]}]'::jsonb) LOOP
    IF private.home_rooms_gallery_is_valid(jsonb_set(legacy,'{roomsPeek}',invalid)) THEN RAISE EXCEPTION 'Invalid gallery accepted'; END IF;
    BEGIN
      UPDATE public.site_content SET draft_payload=jsonb_set(legacy,'{roomsPeek}',invalid) WHERE key='home_sections';
      RAISE EXCEPTION 'Invalid draft accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
      UPDATE public.site_content SET published_payload=jsonb_set(legacy,'{roomsPeek}',invalid) WHERE key='home_sections';
      RAISE EXCEPTION 'Invalid publication accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
END;
$$;
ROLLBACK;
