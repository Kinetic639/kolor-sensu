import { loadMyClient } from "@/features/clients/loaders";
import { panelIntake } from "@/lib/visit-intake";
import { createClient } from "@/lib/supabase/server";
import { visitEventRows, visitRows } from "@repo/scheduling";
import { getVisit, listVisitEvents, searchVisits } from "@repo/supabase";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";
import {
  loadVisitTableParams,
  toVisitSearch,
  visitColumnsAvailable,
  defaultColumnLayout,
  VisitPanel,
  visitPanelCloseHref,
  visitPanelTabs,
  VisitTable,
} from "@repo/ui/visit-table";
import { Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";

// A client's card in the specialist's portal: how to reach them, and their
// visits with this specialist (all of them, the archive too) in the
// bookings' table and side panel. Only their own visits: the database
// says whose; the centre's notes about the client are not here.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MyClientPage({
  params,
  searchParams,
}: PageProps<"/klienci/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const found = await loadMyClient(id);
  if (!found) notFound();
  const { client: person, row: summary, timeZone } = found;

  const loaded = loadVisitTableParams(await searchParams);
  // The card shows every visit with them unless a period is chosen.
  const tableParams =
    loaded.zakres === "nadchodzace"
      ? { ...loaded, zakres: "wszystkie" as const }
      : loaded;
  const path = `/klienci/${id}`;
  const client = await createClient();
  const [page, open, events] = await Promise.all([
    searchVisits(
      client,
      toVisitSearch(tableParams, { own: true, timeZone, clientId: id }),
    ),
    tableParams.wizyta
      ? getVisit(client, tableParams.wizyta, { own: true }).catch(() => null)
      : null,
    tableParams.wizyta
      ? listVisitEvents(client, tableParams.wizyta, { own: true }).catch(
          () => [],
        )
      : null,
  ]);
  const rows = visitRows(page.visits, { timeZone });
  const openRow = open ? visitRows([open], { timeZone })[0]! : null;
  const intake = open ? await panelIntake(client, open.id, timeZone) : null;

  return (
    <FullBleed>
      <PageTitle>{person.name}</PageTitle>
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5">
        <span className="text-[0.9375rem] font-semibold text-[var(--text)]">
          {person.name}
        </span>
        <a
          className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--primary)] hover:underline"
          href={`mailto:${person.email}`}
        >
          <Mail aria-hidden="true" className="size-3.5" />
          {person.email}
        </a>
        {person.phone ? (
          <a
            className="inline-flex items-center gap-1 text-[0.8125rem] text-[var(--primary)] hover:underline"
            href={`tel:${person.phone.replace(/\s+/g, "")}`}
          >
            <Phone aria-hidden="true" className="size-3.5" />
            {person.phone}
          </a>
        ) : null}
        <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums sm:ml-auto">
          {summary.visits} ze mną
          {summary.next ? ` · najbliższa ${summary.next}` : ""}
          {summary.last ? ` · ostatnia ${summary.last}` : ""}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <VisitTable
            caption={`Wizyty: ${person.name}`}
            columns={defaultColumnLayout(
              visitColumnsAvailable({
                showPayment: false,
                showSpecialist: false,
              }),
            )}
            params={tableParams}
            path={path}
            rows={rows}
            total={page.total}
          />
        </div>
        {open && openRow ? (
          <VisitPanel
            closeHref={visitPanelCloseHref(path, tableParams)}
            events={
              events
                ? visitEventRows(events, {
                    timeZone,
                    currencyCode: open.currencyCode,
                  })
                : null
            }
            intake={intake}
            row={openRow}
            tab={tableParams.karta}
            tabs={visitPanelTabs(path, tableParams)}
          />
        ) : null}
      </div>
    </FullBleed>
  );
}
