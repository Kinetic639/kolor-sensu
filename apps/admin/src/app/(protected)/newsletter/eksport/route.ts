import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { newsletterCsv } from "@repo/contracts/newsletter";
import { listNewsletterSubscribers } from "@repo/supabase/newsletter";

// Newsletter → "Pobierz CSV": the subscribed addresses, for moving the list
// elsewhere. A route handler has no layout, so it checks the admin itself
// (and the database checks again).

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePortalRole();
  const subscribers = await listNewsletterSubscribers(await createClient());
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
  }).format(new Date());
  // A byte-order mark, so a spreadsheet reads the Polish letters right.
  return new Response(`﻿${newsletterCsv(subscribers)}\n`, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="newsletter-${day}.csv"`,
    },
  });
}
