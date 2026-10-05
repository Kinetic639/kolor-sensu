import "server-only";

import { bookingWindow } from "@/lib/reference-data";
import { createClient } from "@/lib/supabase/server";
import { listMyClients } from "@repo/supabase";
import { cache } from "react";
import { myClientRows } from "./view-model";

// Moi klienci: the specialist's own clients (the database knows whose).

export const loadMyClients = cache(async () => {
  const [client, window] = await Promise.all([
    createClient(),
    bookingWindow().catch(() => null),
  ]);
  const timeZone = window?.timeZone ?? "Europe/Warsaw";
  const clients = await listMyClients(client).catch((error: unknown) => {
    console.error("[clients] listing failed:", error);
    return null;
  });
  return {
    timeZone,
    clients,
    rows: clients ? myClientRows(clients, timeZone) : [],
  };
});

/** One of them (their card), or null when they are not this one's client. */
export async function loadMyClient(id: string) {
  const { clients, timeZone } = await loadMyClients();
  const found = clients?.find((one) => one.id === id) ?? null;
  return found
    ? { client: found, row: myClientRows([found], timeZone)[0]!, timeZone }
    : null;
}
