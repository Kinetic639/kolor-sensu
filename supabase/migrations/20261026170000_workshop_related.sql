-- A workshop's "Powiązane" (#185): the services and articles the admin
-- picks for it, shown under it on the site with its other coming
-- workshops. Visitors read the picks of a workshop that is not a draft;
-- the admin saves them with the workshop (save_workshop: its body of
-- 20261023130000 with the picks; a call without them keeps them) and
-- reads them back (admin_get_workshop, the same). Grants as before.

CREATE TABLE public.workshop_services (
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services (id) ON DELETE CASCADE,
  PRIMARY KEY (workshop_id, service_id)
);
CREATE INDEX workshop_services_service ON public.workshop_services (service_id);

CREATE TABLE public.workshop_articles (
  workshop_id uuid NOT NULL REFERENCES public.workshops (id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  PRIMARY KEY (workshop_id, article_id)
);
CREATE INDEX workshop_articles_article ON public.workshop_articles (article_id);

ALTER TABLE public.workshop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_articles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workshop_services, public.workshop_articles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.workshop_services, public.workshop_articles TO anon, authenticated;

CREATE POLICY "Picks of a public workshop are readable" ON public.workshop_services
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.workshops AS w
    WHERE w.id = workshop_id AND w.status <> 'draft'
  ));
CREATE POLICY "Picks of a public workshop are readable" ON public.workshop_articles
  FOR SELECT TO anon, authenticated USING (EXISTS (
    SELECT 1 FROM public.workshops AS w
    WHERE w.id = workshop_id AND w.status <> 'draft'
  ));

CREATE OR REPLACE FUNCTION public.admin_get_workshop(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM private.require_workshop_admin();
  SELECT to_jsonb(w) || jsonb_build_object(
      'co_leader_ids', coalesce((
        SELECT jsonb_agg(co.specialist_id ORDER BY co.specialist_id)
        FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ), '[]'::jsonb),
      'service_ids', coalesce((
        SELECT jsonb_agg(link.service_id ORDER BY link.service_id)
        FROM public.workshop_services AS link WHERE link.workshop_id = w.id
      ), '[]'::jsonb),
      'article_ids', coalesce((
        SELECT jsonb_agg(link.article_id ORDER BY link.article_id)
        FROM public.workshop_articles AS link WHERE link.workshop_id = w.id
      ), '[]'::jsonb),
      'meeting_url', (SELECT link.meeting_url FROM public.workshop_online_links AS link WHERE link.workshop_id = w.id),
      'active_registrations', (
        SELECT count(*) FROM public.workshop_registrations AS r
        WHERE r.workshop_id = w.id
          AND r.status IN ('held', 'awaiting_payment', 'confirmed', 'waitlisted', 'offered')
      ),
      'any_registrations', EXISTS (
        SELECT 1 FROM public.workshop_registrations AS r WHERE r.workshop_id = w.id
      )
    )
  INTO v_result
  FROM public.workshops AS w
  WHERE w.id = p_id;
  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION public.save_workshop(p_id uuid, p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
  v_modality public.workshop_modality := coalesce(p_data->>'modality', 'in_person')::public.workshop_modality;
  v_co uuid[] := ARRAY(
    SELECT DISTINCT value::uuid FROM jsonb_array_elements_text(coalesce(p_data->'co_leader_ids', '[]'::jsonb))
  );
  v_link text := nullif(btrim(coalesce(p_data->>'meeting_url', '')), '');
BEGIN
  PERFORM private.require_workshop_admin();
  BEGIN
    IF p_id IS NULL THEN
      INSERT INTO public.workshops (
        slug, title, short_description, body, audience, agenda,
        cover_image_path, cover_alt, seo_title, seo_description,
        specialist_id, modality, location_id, room_id, starts_at, ends_at,
        price_minor, capacity, min_participants, registration_enabled,
        registration_closes_at
      )
      VALUES (
        p_data->>'slug', p_data->>'title',
        nullif(btrim(coalesce(p_data->>'short_description', '')), ''),
        nullif(p_data->'body', 'null'::jsonb),
        nullif(btrim(coalesce(p_data->>'audience', '')), ''),
        nullif(btrim(coalesce(p_data->>'agenda', '')), ''),
        nullif(p_data->>'cover_image_path', ''),
        nullif(btrim(coalesce(p_data->>'cover_alt', '')), ''),
        nullif(btrim(coalesce(p_data->>'seo_title', '')), ''),
        nullif(btrim(coalesce(p_data->>'seo_description', '')), ''),
        (p_data->>'specialist_id')::uuid, v_modality,
        CASE WHEN v_modality = 'in_person' THEN (p_data->>'location_id')::uuid END,
        CASE WHEN v_modality = 'in_person' THEN (p_data->>'room_id')::uuid END,
        (p_data->>'starts_at')::timestamptz, (p_data->>'ends_at')::timestamptz,
        (p_data->>'price_minor')::integer, (p_data->>'capacity')::integer,
        (p_data->>'min_participants')::integer,
        coalesce((p_data->>'registration_enabled')::boolean, false),
        (p_data->>'registration_closes_at')::timestamptz
      )
      RETURNING id INTO v_id;
    ELSE
      UPDATE public.workshops SET
        slug = p_data->>'slug',
        title = p_data->>'title',
        short_description = nullif(btrim(coalesce(p_data->>'short_description', '')), ''),
        body = nullif(p_data->'body', 'null'::jsonb),
        audience = nullif(btrim(coalesce(p_data->>'audience', '')), ''),
        agenda = nullif(btrim(coalesce(p_data->>'agenda', '')), ''),
        cover_image_path = nullif(p_data->>'cover_image_path', ''),
        cover_alt = nullif(btrim(coalesce(p_data->>'cover_alt', '')), ''),
        seo_title = nullif(btrim(coalesce(p_data->>'seo_title', '')), ''),
        seo_description = nullif(btrim(coalesce(p_data->>'seo_description', '')), ''),
        specialist_id = (p_data->>'specialist_id')::uuid,
        modality = v_modality,
        location_id = CASE WHEN v_modality = 'in_person' THEN (p_data->>'location_id')::uuid END,
        room_id = CASE WHEN v_modality = 'in_person' THEN (p_data->>'room_id')::uuid END,
        starts_at = (p_data->>'starts_at')::timestamptz,
        ends_at = (p_data->>'ends_at')::timestamptz,
        price_minor = (p_data->>'price_minor')::integer,
        capacity = (p_data->>'capacity')::integer,
        min_participants = (p_data->>'min_participants')::integer,
        registration_enabled = coalesce((p_data->>'registration_enabled')::boolean, false),
        registration_closes_at = (p_data->>'registration_closes_at')::timestamptz
      WHERE id = p_id AND status <> 'cancelled'
      RETURNING id INTO v_id;
      IF v_id IS NULL THEN
        RAISE EXCEPTION 'Workshop not found or cancelled' USING ERRCODE = 'P0002', HINT = 'not_found';
      END IF;
    END IF;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'This address is taken' USING ERRCODE = '23505', HINT = 'slug_taken';
  END;

  DELETE FROM public.workshop_co_leaders AS co
  WHERE co.workshop_id = v_id
    AND (co.specialist_id <> ALL (v_co) OR co.specialist_id = (p_data->>'specialist_id')::uuid);
  INSERT INTO public.workshop_co_leaders (workshop_id, specialist_id)
  SELECT v_id, leader FROM unnest(v_co) AS leader
  WHERE leader <> (p_data->>'specialist_id')::uuid
  ON CONFLICT DO NOTHING;

  -- The services and articles it points to (#185), replaced when given.
  IF p_data ? 'service_ids' THEN
    DELETE FROM public.workshop_services WHERE workshop_id = v_id;
    INSERT INTO public.workshop_services (workshop_id, service_id)
    SELECT DISTINCT v_id, value::uuid
    FROM jsonb_array_elements_text(p_data->'service_ids');
  END IF;
  IF p_data ? 'article_ids' THEN
    DELETE FROM public.workshop_articles WHERE workshop_id = v_id;
    INSERT INTO public.workshop_articles (workshop_id, article_id)
    SELECT DISTINCT v_id, value::uuid
    FROM jsonb_array_elements_text(p_data->'article_ids');
  END IF;

  IF v_modality = 'online' AND v_link IS NOT NULL THEN
    INSERT INTO public.workshop_online_links (workshop_id, meeting_url)
    VALUES (v_id, v_link)
    ON CONFLICT (workshop_id) DO UPDATE SET meeting_url = EXCLUDED.meeting_url;
  ELSE
    DELETE FROM public.workshop_online_links WHERE workshop_id = v_id;
  END IF;
  RETURN v_id;
END;
$$;
