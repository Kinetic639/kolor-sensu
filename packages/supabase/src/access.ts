import type { PortalUser } from "@repo/contracts/access";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// Who may use the admin's portal (Ustawienia → Dostęp). The database
// checks who asks: only an admin lists the users or changes their access,
// nobody takes their own and the last admin stays.

type Client = SupabaseClient<Database>;

const CODES = new Set(["forbidden", "not_found", "own_access", "last_admin"]);

export class AccessError extends Error {
  override name = "AccessError";
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const refusal = (error: { message: string; hint?: string | null }) =>
  new AccessError(
    error.hint && CODES.has(error.hint) ? error.hint : "unknown",
    error.message,
  );

export async function listPortalUsers(client: Client): Promise<PortalUser[]> {
  const { data, error } = await client.rpc("list_portal_users");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.user_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    isAdmin: row.is_admin,
    isSpecialist: row.is_specialist,
    signedInAt: row.signed_in_at,
    invitedAt: row.invited_at,
  }));
}

export async function grantAdmin(client: Client, userId: string) {
  const { error } = await client.rpc("grant_admin", { p_user: userId });
  if (error) throw refusal(error);
}

export async function revokeAdmin(client: Client, userId: string) {
  const { error } = await client.rpc("revoke_admin", { p_user: userId });
  if (error) throw refusal(error);
}

/** The account with the address (the service key only), or none. */
export async function portalUserIdByEmail(client: Client, email: string) {
  const { data, error } = await client.rpc("portal_user_id_by_email", {
    p_email: email,
  });
  if (error) throw error;
  return data ?? null;
}
