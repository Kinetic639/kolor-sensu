-- Keep any existing photos; restrict future uploads to three per room.
CREATE OR REPLACE FUNCTION "public"."add_room_image"("p_room_id" "uuid", "p_storage_path" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  image_count integer;
  new_id uuid;
BEGIN
  PERFORM private.require_admin();

  -- Serialises concurrent uploads to the same room.
  PERFORM 1 FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO image_count
  FROM public.room_images
  WHERE room_id = p_room_id;

  IF image_count >= 3 THEN
    RAISE EXCEPTION 'A room can have at most 3 photos' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.room_images (room_id, storage_path, position, is_main)
  VALUES (p_room_id, p_storage_path, image_count, image_count = 0)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
