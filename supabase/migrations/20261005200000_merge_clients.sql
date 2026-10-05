-- Klienci: one person booked under two addresses is two clients. The
-- admin merges the other card into this one: its visits come over (the
-- ones to come take this card's name, e-mail and phone, so the e-mails go
-- to one address; the past ones keep what was given then), the notes are
-- put together, a phone is kept where this card had none, and the other
-- card goes.

CREATE FUNCTION public.merge_clients(p_keep uuid, p_merge uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_keep public.clients;
  v_merge public.clients;
  v_moved integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre merges its clients'
      USING ERRCODE = '42501', HINT = 'forbidden';
  END IF;
  IF p_keep = p_merge THEN
    RAISE EXCEPTION 'The same client' USING HINT = 'same_client';
  END IF;
  SELECT * INTO v_keep FROM public.clients WHERE id = p_keep FOR UPDATE;
  SELECT * INTO v_merge FROM public.clients WHERE id = p_merge FOR UPDATE;
  IF v_keep.id IS NULL OR v_merge.id IS NULL THEN
    RAISE EXCEPTION 'No such client' USING HINT = 'not_found';
  END IF;

  UPDATE public.clients
  SET phone = coalesce(v_keep.phone, v_merge.phone),
    notes = nullif(concat_ws(E'\n\n', v_keep.notes, v_merge.notes), ''),
    created_at = least(v_keep.created_at, v_merge.created_at)
  WHERE id = p_keep;

  -- The visits to come: this card's details (one address for e-mails).
  UPDATE public.appointments
  SET client_name = v_keep.name,
    client_email = v_keep.email,
    client_phone = coalesce(v_keep.phone, v_merge.phone)
  WHERE client_id = p_merge
    AND status IN ('confirmed', 'awaiting_payment', 'held')
    AND lower(during) > now();

  -- Every visit of the other card belongs to this one.
  UPDATE public.appointments SET client_id = p_keep WHERE client_id = p_merge;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  DELETE FROM public.clients WHERE id = p_merge;
  RETURN v_moved;
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_clients(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_clients(uuid, uuid) TO authenticated;

-- Likely the same person as this client: the same name, or the same
-- phone (its digits), on another card.
CREATE FUNCTION public.client_duplicates(p_client uuid)
RETURNS TABLE (id uuid, name text, email text, phone text, reason text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT other.id, other.name, other.email, other.phone,
    CASE
      WHEN lower(btrim(other.name)) = lower(btrim(this.name)) THEN 'name'
      ELSE 'phone'
    END
  FROM public.clients AS this
  JOIN public.clients AS other ON other.id <> this.id
  WHERE this.id = p_client
    AND public.has_role('admin')
    AND other.forgotten_at IS NULL
    AND (
      lower(btrim(other.name)) = lower(btrim(this.name))
      OR (
        length(regexp_replace(coalesce(this.phone, ''), '\D', '', 'g')) >= 9
        AND right(regexp_replace(coalesce(other.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(this.phone, '\D', '', 'g'), 9)
      )
    )
  ORDER BY other.name
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.client_duplicates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_duplicates(uuid) TO authenticated;
