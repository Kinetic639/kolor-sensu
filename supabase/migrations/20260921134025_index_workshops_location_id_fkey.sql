-- Covers the workshops_location_id_fkey FK (ON DELETE RESTRICT), so
-- deleting/checking a location doesn't force a sequential scan over
-- workshops. workshops_room_id_starts_at_idx already covers room_id (the
-- leading column of the composite workshops_room_location_fkey).
CREATE INDEX workshops_location_id_idx
ON public.workshops (location_id)
WHERE location_id IS NOT NULL;
