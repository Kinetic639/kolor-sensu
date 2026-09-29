-- Colours that tell rooms and specialists apart in schedules and lists.
-- Lowercase #rrggbb, or NULL for the automatic colour (by position).
-- Admins set them: rooms through the usual update, specialists through a
-- function (specialists have no direct update).

ALTER TABLE public.rooms
  ADD COLUMN color text,
  ADD CONSTRAINT rooms_color_format CHECK (color ~ '^#[0-9a-f]{6}$');

ALTER TABLE public.specialists
  ADD COLUMN color text,
  ADD CONSTRAINT specialists_color_format CHECK (color ~ '^#[0-9a-f]{6}$');

CREATE OR REPLACE FUNCTION public.set_specialist_color(
  p_specialist_id uuid,
  p_color text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_color text := lower(nullif(trim(p_color), ''));
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role('admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.specialists
  SET color = v_color
  WHERE id = p_specialist_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_color;
END;
$$;

REVOKE ALL ON FUNCTION public.set_specialist_color(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_specialist_color(uuid, text) TO authenticated;
