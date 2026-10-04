import type { Closure, ClosureInput } from "@repo/contracts/closures";
import type { Database } from "@repo/contracts/database";
import type { SupabaseClient } from "@supabase/supabase-js";

// The days the whole centre is closed (Ustawienia → Dni zamknięcia). The
// database keeps visits off them; here the admin lists and edits them.

type Client = SupabaseClient<Database>;

const toRow = (input: ClosureInput) => ({
  starts_on: input.startsOn,
  ends_on: input.endsOn,
  reason: input.reason,
});

export async function listClosures(client: Client): Promise<Closure[]> {
  const { data, error } = await client
    .from("centre_closures")
    .select("id, starts_on, ends_on, reason")
    .order("starts_on");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    reason: row.reason,
  }));
}

export async function saveClosure(
  client: Client,
  id: string | null,
  input: ClosureInput,
) {
  const { error } = id
    ? await client.from("centre_closures").update(toRow(input)).eq("id", id)
    : await client.from("centre_closures").insert(toRow(input));
  if (error) throw error;
}

/** Several at once (the year's public holidays). */
export async function addClosures(client: Client, inputs: ClosureInput[]) {
  const { error } = await client
    .from("centre_closures")
    .insert(inputs.map(toRow));
  if (error) throw error;
}

export async function deleteClosure(client: Client, id: string) {
  const { error } = await client.from("centre_closures").delete().eq("id", id);
  if (error) throw error;
}

/** How many booked visits fall on the days (they stay; the admin moves them). */
export async function visitsOnDays(client: Client, from: string, to: string) {
  const { data, error } = await client.rpc("visits_on_days", {
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data ?? 0;
}
