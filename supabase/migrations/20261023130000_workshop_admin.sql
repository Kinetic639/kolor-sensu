-- Workshops, PR 2 (docs/product/workshops-plan.md): the admin portal. A
-- workshop is saved whole (its fields, co-leaders and online link) by one
-- function; publishing checks it is complete and in the future; it goes
-- back to a draft, or is deleted, only while nobody signed up. The list
-- shows each workshop with its seats and money. Two switches say whether
-- the site shows Warsztaty in its menu and on its homepage.
--
-- Every function here checks the admin role. The workshop’s own triggers
-- (20261023080000) still check the blocks, the seats and the cancelling.

-- ------------------------------------------------------------ the site’s switches

ALTER TABLE public.center_settings
  ADD COLUMN workshops_in_menu boolean NOT NULL DEFAULT true,
  ADD COLUMN workshops_on_home boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.workshop_visibility()
RETURNS TABLE (in_menu boolean, on_home boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT settings.workshops_in_menu, settings.workshops_on_home
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$$;

CREATE OR REPLACE FUNCTION private.require_workshop_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins manage workshops' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_workshop_visibility(p_in_menu boolean, p_on_home boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_workshop_admin();
  UPDATE public.center_settings
  SET workshops_in_menu = coalesce(p_in_menu, workshops_in_menu),
      workshops_on_home = coalesce(p_on_home, workshops_on_home)
  WHERE id = 1;
END;
$$;

-- ------------------------------------------------------------ the list

CREATE OR REPLACE FUNCTION public.admin_list_workshops()
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  status public.workshop_status,
  modality public.workshop_modality,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  min_participants integer,
  price_minor integer,
  currency_code text,
  confirmed boolean,
  registration_enabled boolean,
  leaders text,
  location_name text,
  room_name text,
  confirmed_count integer,
  awaiting_count integer,
  held_count integer,
  waitlist_count integer,
  paid_minor bigint,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_workshop_admin();
  RETURN QUERY
  SELECT w.id, w.slug, w.title, w.status, w.modality, w.starts_at, w.ends_at,
    w.capacity, w.min_participants, w.price_minor, w.currency_code,
    w.confirmed_at IS NOT NULL OR w.min_participants IS NULL,
    w.registration_enabled,
    (SELECT string_agg(private.specialist_display_name(leader.id), ', ' ORDER BY leader.main DESC, leader.id)
      FROM (
        SELECT w.specialist_id AS id, true AS main
        UNION
        SELECT co.specialist_id, false FROM public.workshop_co_leaders AS co WHERE co.workshop_id = w.id
      ) AS leader),
    location.name, room.name,
    count(r.id) FILTER (WHERE r.status = 'confirmed')::integer,
    count(r.id) FILTER (WHERE r.status = 'awaiting_payment' AND r.payment_due_at > now())::integer,
    count(r.id) FILTER (WHERE (r.status = 'held' AND r.hold_expires_at > now())
      OR (r.status = 'offered' AND r.offer_expires_at > now()))::integer,
    count(r.id) FILTER (WHERE r.status = 'waitlisted')::integer,
    coalesce(sum(r.paid_minor - r.refunded_minor), 0)::bigint,
    w.updated_at
  FROM public.workshops AS w
  LEFT JOIN public.locations AS location ON location.id = w.location_id
  LEFT JOIN public.rooms AS room ON room.id = w.room_id
  LEFT JOIN public.workshop_registrations AS r ON r.workshop_id = w.id
  GROUP BY w.id, location.name, room.name
  ORDER BY w.starts_at;
END;
$$;

-- One workshop for its page in the portal: every field, the co-leaders
-- and the link.
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

-- ------------------------------------------------------------ saving

-- Saves a workshop whole (p_id null: a new draft): its fields from the
-- portal’s form, its co-leaders (replaced) and its online link (set, or
-- removed when empty). Its id. Refusals: slug_taken, and the triggers’
-- (specialist_busy, specialist_away, room_busy, one_day,
-- capacity_below_taken) with the constraints’ own.
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

-- Publishes a draft once it is complete and in the future. Refusal:
-- incomplete (DETAIL: the missing fields), then the blocks’ (busy).
CREATE OR REPLACE FUNCTION public.publish_workshop(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_workshop public.workshops%ROWTYPE;
  v_missing text[] := ARRAY[]::text[];
BEGIN
  PERFORM private.require_workshop_admin();
  SELECT * INTO v_workshop FROM public.workshops WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR v_workshop.status <> 'draft' THEN
    RAISE EXCEPTION 'Only a draft is published' USING HINT = 'not_draft';
  END IF;
  IF v_workshop.short_description IS NULL THEN
    v_missing := array_append(v_missing, 'short_description');
  END IF;
  IF v_workshop.starts_at <= now() THEN
    v_missing := array_append(v_missing, 'starts_at');
  END IF;
  IF array_length(v_missing, 1) > 0 THEN
    RAISE EXCEPTION 'The workshop is not complete'
      USING HINT = 'incomplete', DETAIL = array_to_string(v_missing, ',');
  END IF;
  UPDATE public.workshops SET status = 'published' WHERE id = p_id;
END;
$$;

-- Back to a draft (off the site), while nobody is signed up.
CREATE OR REPLACE FUNCTION public.unpublish_workshop(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_workshop_admin();
  PERFORM 1 FROM public.workshops WHERE id = p_id FOR UPDATE;
  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations AS r
    WHERE r.workshop_id = p_id
      AND r.status IN ('held', 'awaiting_payment', 'confirmed', 'waitlisted', 'offered')
  ) THEN
    RAISE EXCEPTION 'People are signed up' USING HINT = 'has_registrations';
  END IF;
  UPDATE public.workshops SET status = 'draft' WHERE id = p_id AND status = 'published';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a published workshop is withdrawn' USING HINT = 'not_published';
  END IF;
END;
$$;

-- Deletes a workshop nobody ever signed up for and no code is for.
CREATE OR REPLACE FUNCTION public.delete_workshop(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  PERFORM private.require_workshop_admin();
  IF EXISTS (SELECT 1 FROM public.workshop_registrations WHERE workshop_id = p_id) THEN
    RAISE EXCEPTION 'People signed up for it' USING HINT = 'has_registrations';
  END IF;
  IF EXISTS (SELECT 1 FROM public.discount_codes WHERE workshop_id = p_id) THEN
    RAISE EXCEPTION 'A discount code is for it' USING HINT = 'used_by_code';
  END IF;
  DELETE FROM public.workshops WHERE id = p_id AND status IN ('draft', 'cancelled');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only a draft or a cancelled workshop is deleted' USING HINT = 'not_deletable';
  END IF;
END;
$$;

-- ------------------------------------------------------------ access

REVOKE ALL ON FUNCTION private.require_workshop_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.require_workshop_admin() TO authenticated;

REVOKE ALL ON FUNCTION public.workshop_visibility() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.workshop_visibility() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.set_workshop_visibility(boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_workshops() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_workshop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_workshop(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.publish_workshop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unpublish_workshop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_workshop(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_workshop_visibility(boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_workshops() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_workshop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_workshop(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_workshop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_workshop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workshop(uuid) TO authenticated;
