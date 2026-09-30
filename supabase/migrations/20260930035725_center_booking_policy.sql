-- The centre's rules for changing a booked visit (docs/product/booking-plan.md,
-- R8), set by the admin in Ustawienia: a full refund when cancelled at least
-- `cancellation_window_hours` before (none after); a client may move the visit
-- themselves `max_self_reschedules` times, at least `reschedule_window_hours`
-- before; anything else goes through the centre.

ALTER TABLE public.center_settings
  ADD COLUMN reschedule_window_hours integer NOT NULL DEFAULT 48,
  ADD COLUMN max_self_reschedules integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT center_settings_reschedule_window_range CHECK (
    reschedule_window_hours BETWEEN 0 AND 720
  ),
  ADD CONSTRAINT center_settings_max_self_reschedules_range CHECK (
    max_self_reschedules BETWEEN 0 AND 5
  ),
  ALTER COLUMN cancellation_window_hours SET DEFAULT 48;

-- The centre's rule: 48 hours (was the 24-hour placeholder).
UPDATE public.center_settings
SET cancellation_window_hours = 48
WHERE cancellation_window_hours = 24;
