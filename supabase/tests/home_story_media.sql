-- The new metadata is optional for legacy slides and cannot bypass the
-- existing CMS checks. Both saved drafts and published JSON are checked.
BEGIN;
DO $$
DECLARE
  payload jsonb := '{"steps":[{"heading":"Edukacja","text":"Wiedza"}]}';
  valid jsonb := '{"type":"articles","source":"manual","ids":["11111111-1111-4111-8111-111111111111"]}';
  invalid jsonb;
BEGIN
  IF NOT private.home_story_media_is_valid(payload) OR NOT private.home_story_media_is_valid(NULL) THEN
    RAISE EXCEPTION 'Legacy content must remain valid';
  END IF;
  payload := jsonb_set(payload,'{steps,0,media}',valid);
  UPDATE public.site_content SET draft_payload=payload WHERE key='home_story';
  UPDATE public.site_content SET published_payload=payload,published_at=now() WHERE key='home_story';
  FOR invalid IN SELECT value FROM jsonb_array_elements('[
    {"type":"unknown"},
    {"type":"articles","source":"manual","ids":[]},
    {"type":"articles","source":"manual","ids":["11111111-1111-4111-8111-111111111111","11111111-1111-4111-8111-111111111111"]},
    {"type":"ebooks","source":"manual","ids":["invalid"]},
    {"type":"workshops","source":"manual","ids":["11111111-1111-4111-8111-111111111111","22222222-2222-4222-8222-222222222222"]},
    {"type":"image","unexpected":true},
    {"type":"articles","source":"auto","ids":null}
  ]'::jsonb) LOOP
    IF private.home_story_media_is_valid(jsonb_set(payload,'{steps,0,media}',invalid)) THEN
      RAISE EXCEPTION 'Invalid media accepted: %',invalid;
    END IF;
    BEGIN
      UPDATE public.site_content SET draft_payload=jsonb_set(payload,'{steps,0,media}',invalid) WHERE key='home_story';
      RAISE EXCEPTION 'Invalid draft accepted: %',invalid;
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN
      UPDATE public.site_content SET published_payload=jsonb_set(payload,'{steps,0,media}',invalid) WHERE key='home_story';
      RAISE EXCEPTION 'Invalid publication accepted: %',invalid;
    EXCEPTION WHEN check_violation THEN NULL; END;
  END LOOP;
END;
$$;
ROLLBACK;
