import { createClient } from "@/lib/supabase/server";
import { visitRows } from "@repo/scheduling";
import { getBookingWindow, searchVisits } from "@repo/supabase";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";
import {
  loadVisitTableParams,
  toVisitSearch,
  VisitTable,
  VisitTableToolbar,
} from "@repo/ui/visit-table";

// Mój kalendarz (R9): the specialist's own visits (even when they are also
// the centre's admin), with the client's contact and notes; no payments.
// The database searches, filters, sorts and pages. Changes go through the
// centre. The calendar views come in stage K.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadVisitTableParams(await searchParams);
  const client = await createClient();
  const [window, page] = await Promise.all([
    getBookingWindow(client),
    searchVisits(client, toVisitSearch(params, { own: true })).catch(
      (error: unknown) => {
        console.error("[visits] searching failed:", error);
        return null;
      },
    ),
  ]);

  if (!page) {
    return (
      <div className="space-y-5">
        <PageTitle>Kalendarz</PageTitle>
        <EmptyState
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
          title="Brak profilu specjalisty"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle>Kalendarz</PageTitle>
      <VisitTableToolbar params={params} path={PATH} />
      <VisitTable
        caption="Moje wizyty"
        params={params}
        path={PATH}
        rows={visitRows(page.visits, {
          timeZone: window?.timeZone ?? "Europe/Warsaw",
        })}
        total={page.total}
      />
      <p className="text-sm text-[var(--text-muted)]">
        Zmianę lub odwołanie wizyty ustal z centrum.
      </p>
    </div>
  );
}
