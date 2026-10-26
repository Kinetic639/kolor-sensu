-- A person's first and last name apart (20261026120000): the whole name is
-- made of the parts written, a whole name written alone is split (at its
-- last space, or by the parts a write function remembered), the write
-- functions take the parts and their older signatures split the whole
-- name. Rolled back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7f200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'names-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Names","last_name":"Admin"}', now(), now(), false, false),
  ('7f200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'names-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Names","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7f200000-0000-4000-8000-000000000001', 'admin'),
  ('7f200000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
SELECT 'names-ws', 'Imiona', 'Krótko', specialist.id, 'online',
  ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw',
  ((current_date + 20) + time '19:00') AT TIME ZONE 'Europe/Warsaw',
  10000, 10, true, 'published'
FROM public.specialists AS specialist
WHERE specialist.user_id = '7f200000-0000-4000-8000-000000000002';

-- A: the helpers.
DO $$
BEGIN
  IF private.full_name(' Anna ', ' Nowak ') <> 'Anna Nowak'
     OR private.full_name('Anna', NULL) <> 'Anna'
     OR private.full_name('', ' ') IS NOT NULL THEN
    RAISE EXCEPTION 'A: full_name';
  END IF;
  IF private.name_first('Anna Maria Nowak') <> 'Anna Maria'
     OR private.name_last('Anna Maria Nowak') <> 'Nowak'
     OR private.name_first('Anna') <> 'Anna' OR private.name_last('Anna') IS NOT NULL THEN
    RAISE EXCEPTION 'A: name_first / name_last';
  END IF;
END;
$$;

-- B: a client's card: parts make the whole; a whole alone is split; the
-- parts remembered by a write function win over the last space.
DO $$
DECLARE
  v_id uuid;
  v_row record;
BEGIN
  INSERT INTO public.clients (email, name, first_name, last_name)
  VALUES ('names-b@example.invalid', 'ignored', 'Ewa', 'Kowalska-Nowak')
  RETURNING id INTO v_id;
  SELECT * INTO v_row FROM public.clients WHERE id = v_id;
  IF v_row.name <> 'Ewa Kowalska-Nowak' THEN
    RAISE EXCEPTION 'B: the parts did not make the name: %', v_row.name;
  END IF;

  UPDATE public.clients SET name = 'Anna Maria Nowak' WHERE id = v_id;
  SELECT * INTO v_row FROM public.clients WHERE id = v_id;
  IF v_row.first_name <> 'Anna Maria' OR v_row.last_name <> 'Nowak' THEN
    RAISE EXCEPTION 'B: the name was not split at its last space: % / %', v_row.first_name, v_row.last_name;
  END IF;

  PERFORM private.remember_name_parts('Jan', 'de la Cruz');
  UPDATE public.clients SET name = 'Jan de la Cruz' WHERE id = v_id;
  SELECT * INTO v_row FROM public.clients WHERE id = v_id;
  IF v_row.first_name <> 'Jan' OR v_row.last_name <> 'de la Cruz' THEN
    RAISE EXCEPTION 'B: the remembered parts were not used: % / %', v_row.first_name, v_row.last_name;
  END IF;

  UPDATE public.clients SET notes = 'Uwagi' WHERE id = v_id;
  SELECT * INTO v_row FROM public.clients WHERE id = v_id;
  IF v_row.name <> 'Jan de la Cruz' OR v_row.last_name <> 'de la Cruz' THEN
    RAISE EXCEPTION 'B: another change touched the name';
  END IF;
END;
$$;

-- C: a workshop seat, by the new signature and by the older one.
DO $$
DECLARE
  v_token text;
  v_row record;
BEGIN
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('names-ws', 'names-key-1');
  PERFORM public.save_workshop_registration_details(v_token, 'Maria', 'von Berg', 'maria-names@example.invalid',
    '500600700', NULL, true, true);
  SELECT * INTO v_row FROM public.workshop_registrations
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  IF v_row.client_name <> 'Maria von Berg' OR v_row.client_first_name <> 'Maria'
     OR v_row.client_last_name <> 'von Berg' THEN
    RAISE EXCEPTION 'C: the new signature: % (% / %)', v_row.client_name, v_row.client_first_name, v_row.client_last_name;
  END IF;

  SELECT access_token INTO v_token FROM public.hold_workshop_seat('names-ws', 'names-key-2');
  PERFORM public.save_workshop_registration_details(v_token, 'Ola Nowak', 'ola-names@example.invalid',
    NULL, NULL, true, true);
  SELECT * INTO v_row FROM public.workshop_registrations
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  IF v_row.client_first_name <> 'Ola' OR v_row.client_last_name <> 'Nowak' THEN
    RAISE EXCEPTION 'C: the older signature did not split: % / %', v_row.client_first_name, v_row.client_last_name;
  END IF;
END;
$$;

-- D: the admin edits a client's card by its parts (the card's id read
-- first, as the owner: the portal reads clients through its functions).
CREATE TEMP TABLE names_ids AS
SELECT id FROM public.clients WHERE email = 'names-b@example.invalid';
GRANT SELECT ON names_ids TO authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"7f200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.admin_update_client((SELECT id FROM names_ids), 'Zofia', 'van der Berg',
    'names-b@example.invalid', NULL, NULL);
END;
$$;
RESET ROLE;
DO $$
DECLARE
  v_row record;
BEGIN
  SELECT * INTO v_row FROM public.clients WHERE email = 'names-b@example.invalid';
  IF v_row.name <> 'Zofia van der Berg' OR v_row.first_name <> 'Zofia' OR v_row.last_name <> 'van der Berg' THEN
    RAISE EXCEPTION 'D: the card: % (% / %)', v_row.name, v_row.first_name, v_row.last_name;
  END IF;
END;
$$;

-- E: the admin's list finds a client by either order of the name and sorts
-- by the last name; the card gives the parts.
INSERT INTO public.clients (email, name, first_name, last_name)
VALUES ('names-c@example.invalid', 'ignored', 'Adam', 'Żak'),
       ('names-d@example.invalid', 'ignored', 'Ewa', 'Abacka');
SELECT set_config('request.jwt.claims',
  '{"sub":"7f200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_order text;
  v_card record;
BEGIN
  IF (SELECT count(*) FROM public.search_clients(p_query => 'berg zofia')) <> 1
     OR (SELECT count(*) FROM public.search_clients(p_query => 'zofia van')) <> 1 THEN
    RAISE EXCEPTION 'E: not found by either order of the name';
  END IF;
  SELECT string_agg(found.last_name, ', ' ORDER BY found.ordinality) INTO v_order
  FROM public.search_clients(p_sort => 'name', p_desc => false, p_limit => 100)
    WITH ORDINALITY AS found
  WHERE found.email IN ('names-b@example.invalid', 'names-c@example.invalid', 'names-d@example.invalid');
  IF v_order <> 'Abacka, van der Berg, Żak' THEN
    RAISE EXCEPTION 'E: sorted as %', v_order;
  END IF;
  SELECT * INTO v_card FROM public.get_client((SELECT id FROM names_ids));
  IF v_card.first_name <> 'Zofia' OR v_card.last_name <> 'van der Berg' THEN
    RAISE EXCEPTION 'E: the card''s parts: % / %', v_card.first_name, v_card.last_name;
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
