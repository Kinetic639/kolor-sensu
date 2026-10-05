-- The grid's checks (20261005070000_schedule_grid) are triggers that call
-- private.on_grid. Run as the signed-in user (an admin saving a room's
-- hours or blocks straight to the table), they had no right to call it
-- ("permission denied for function on_grid"): they run as their owner now,
-- like the other checks. Found by the database tests (rooms_domain).
ALTER FUNCTION private.require_on_grid() SECURITY DEFINER;
ALTER FUNCTION private.require_grid_fits() SECURITY DEFINER;
