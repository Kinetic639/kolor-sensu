BEGIN;
DO $$
DECLARE
  legacy jsonb := '{"steps":[{"heading":"Nowa wiedza","text":"Opis"}]}';
  valid jsonb := '[{"text":"Nowa ","tone":"green"},{"text":"wiedza","tone":"pink"}]';
  payload jsonb;
  invalid jsonb;
BEGIN
  IF NOT private.home_story_headings_are_valid(legacy)
    OR NOT private.home_story_headings_are_valid(NULL) THEN
    RAISE EXCEPTION 'Legacy slide titles must remain valid';
  END IF;
  payload := jsonb_set(legacy, '{steps,0,headingSegments}', valid);
  UPDATE public.site_content SET draft_payload = payload WHERE key = 'home_story';
  UPDATE public.site_content SET published_payload = payload, published_at = now() WHERE key = 'home_story';
  FOR invalid IN SELECT value FROM jsonb_array_elements('[
    null, {}, [], [null],
    [{"text":"Nowa wiedza","tone":"red"}],
    [{"text":"Inne słowa","tone":"green"}],
    [{"text":"","tone":"green"}],
    [{"text":"Nowa wiedza","tone":"green","other":true}]
  ]'::jsonb) LOOP
    IF private.home_story_headings_are_valid(jsonb_set(legacy, '{steps,0,headingSegments}', invalid)) THEN
      RAISE EXCEPTION 'Invalid title colours accepted: %', invalid;
    END IF;
    BEGIN
      UPDATE public.site_content SET draft_payload = jsonb_set(legacy, '{steps,0,headingSegments}', invalid) WHERE key = 'home_story';
      RAISE EXCEPTION 'Invalid draft accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
      UPDATE public.site_content SET published_payload = jsonb_set(legacy, '{steps,0,headingSegments}', invalid) WHERE key = 'home_story';
      RAISE EXCEPTION 'Invalid publication accepted';
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
END;
$$;
ROLLBACK;
