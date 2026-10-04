-- A visit never owes back more than its price (R9, R12, R14). The functions
-- that set what is owed keep within it already (cancel_booking,
-- centre_cancel_visit, centre_refund_visit, centre_settle_visit); this is
-- the last line should one of them ever go wrong: the change fails instead
-- of a promise larger than the payment being written. (Stripe itself never
-- gives back more than was paid.) A visit's price is fixed once booked and
-- is what the client paid.

ALTER TABLE public.appointments
  DROP CONSTRAINT appointments_refund_due_valid,
  ADD CONSTRAINT appointments_refund_due_valid CHECK (
    refund_due_minor IS NULL
    OR (refund_due_minor >= 0 AND refund_due_minor <= price_minor)
  );
