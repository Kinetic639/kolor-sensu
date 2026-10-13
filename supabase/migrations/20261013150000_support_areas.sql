-- Home → "Obszary wsparcia" (the areas of help): a CMS list edited by the
-- admin, shown on the homepage as small circles around a large one
-- (docs/architecture/cms-domain.md). One more fixed site_content key, its
-- payload checked like the others, and a public bucket for the areas'
-- photos that only admins can write to.

-- The key.
ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY['home'::text, 'rooms'::text, 'support_areas'::text]));

-- Its payload: { "areas": [ ...1 to 10 objects, each with an id, a title and
-- a lead ] }. The fields' types, lengths, links and unknown keys are checked
-- by supportAreasContentSchema (packages/contracts/src/cms.ts).
CREATE OR REPLACE FUNCTION private.site_content_payload_is_valid(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT jsonb_typeof(p_payload) = 'object' AND CASE p_key
    WHEN 'home' THEN p_payload ? 'heading' AND p_payload ? 'body'
    WHEN 'rooms' THEN
      jsonb_typeof(p_payload -> 'showAmenitiesSection') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showLocationDetails') = 'boolean'
    WHEN 'support_areas' THEN
      jsonb_typeof(p_payload -> 'areas') = 'array'
      AND jsonb_array_length(p_payload -> 'areas') BETWEEN 1 AND 10
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'areas') AS area
        WHERE jsonb_typeof(area) <> 'object'
          OR jsonb_typeof(area -> 'id') IS DISTINCT FROM 'string'
          OR jsonb_typeof(area -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(area -> 'lead') IS DISTINCT FROM 'string'
      )
    ELSE false
  END;
$$;

-- A draft to start from; nothing is published, so the site shows its own
-- copy until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES (
  'support_areas',
  '{"areas": [
    {"id": "indywidualna", "title": "Terapia indywidualna", "lead": "Spotkania jeden na jeden, w Twoim tempie: o tym, co trudne, i o tym, czego potrzebujesz.", "imagePath": null, "imageAlt": "", "link": null},
    {"id": "pary", "title": "Terapia dla par", "lead": "Wspólna przestrzeń, by lepiej się słyszeć, rozumieć i szukać porozumienia.", "imagePath": null, "imageAlt": "", "link": null},
    {"id": "mlodziez", "title": "Wsparcie dzieci i młodzieży", "lead": "Pomoc dla młodszych osób i ich rodziców: w trudnych emocjach, w szkole i w relacjach.", "imagePath": null, "imageAlt": "", "link": null},
    {"id": "rodzinna", "title": "Terapia rodzinna", "lead": "Praca z całą rodziną nad tym, co dzieje się między jej członkami.", "imagePath": null, "imageAlt": "", "link": null},
    {"id": "warsztaty", "title": "Warsztaty i rozwój", "lead": "Grupy i spotkania tematyczne dla osób, które chcą lepiej siebie poznać.", "imagePath": null, "imageAlt": "", "link": {"href": "/warsztaty", "label": "Zobacz warsztaty"}}
  ]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- The site's own photos (the areas', for now): public, so the site reads
-- them by URL; only admins add, replace or remove them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media', 'site-media', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can read site media objects" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'site-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can upload site media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can update site media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'site-media' AND public.has_role('admin'::public.app_role))
WITH CHECK (bucket_id = 'site-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete site media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-media' AND public.has_role('admin'::public.app_role));
