-- Removing a client's details: the client first, then their visits. A
-- visit's new address links it to a client by that address (the trigger
-- link_appointment_client), so the client must already have it, or the
-- trigger makes a second one and the client's own change collides.
CREATE OR REPLACE FUNCTION private.forget_client_data(p_client uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  placeholder text := 'usuniety-' || left(replace(p_client::text, '-', ''), 12) || '@anonim.invalid';
BEGIN
  UPDATE public.clients
  SET name = 'Klient usunięty',
    email = placeholder,
    phone = NULL,
    notes = NULL,
    forgotten_at = now()
  WHERE id = p_client;

  UPDATE public.notifications AS notification
  SET details = notification.details || jsonb_build_object('client_name', 'Klient usunięty')
  WHERE notification.details ? 'client_name'
    AND notification.appointment_id IN (
      SELECT id FROM public.appointments WHERE client_id = p_client
    );

  DELETE FROM public.visit_intakes
  WHERE appointment_id IN (SELECT id FROM public.appointments WHERE client_id = p_client);

  UPDATE public.appointments
  SET client_name = 'Klient usunięty',
    client_email = placeholder,
    client_phone = NULL,
    client_notes = NULL
  WHERE client_id = p_client;
END;
$$;
