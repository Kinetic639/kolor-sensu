-- As the other broadcasts: no one calls it but its trigger.
REVOKE ALL ON FUNCTION private.broadcast_profile_draft_change()
  FROM PUBLIC, anon, authenticated;
