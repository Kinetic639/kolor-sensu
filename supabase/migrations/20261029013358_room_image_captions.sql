-- Per-photo captions belong to the room gallery, not to homepage CMS content.
ALTER TABLE public.room_images
  ADD COLUMN caption text NOT NULL DEFAULT '',
  ADD CONSTRAINT room_images_caption_length CHECK (char_length(caption) <= 200);

CREATE FUNCTION public.update_room_image_caption(p_room_id uuid, p_image_id uuid, p_caption text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_admin();
  IF p_caption IS NULL OR char_length(btrim(p_caption)) > 200 THEN
    RAISE EXCEPTION 'Caption must contain at most 200 characters' USING ERRCODE = '22023';
  END IF;
  UPDATE public.room_images SET caption = btrim(p_caption)
  WHERE id = p_image_id AND room_id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room photo not found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_room_image_caption(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_room_image_caption(uuid, uuid, text) TO authenticated, service_role;
