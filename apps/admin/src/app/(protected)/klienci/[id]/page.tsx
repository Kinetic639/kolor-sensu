import { updateClientAction } from "@/features/clients/actions";
import { ForgetClientButton } from "@/features/clients/forget-client";
import { MergeClientButton } from "@/features/clients/merge-client";
import { loadClientCard } from "@/features/clients/loaders";
import { CentreVisitToolbar } from "@/features/visits/cancel-visit";
import { specialistAvatars } from "@/lib/reference-data";
import { VisitActions } from "@/features/visits/visit-actions";
import { ClientCard, EditClientButton } from "@repo/ui/client-table";
import { PageTitle } from "@repo/ui/portal-content";
import {
  loadVisitTableParams,
  VisitPanel,
  VisitTable,
  visitPanelCloseHref,
  visitPanelTabs,
} from "@repo/ui/visit-table";
import { notFound } from "next/navigation";

// A client's card (R15): how to reach them, their visits in numbers, the
// centre's note, and every visit of theirs in the bookings table (with the
// same side panel and changes as there), latest first.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const visitLabel = (row: {
  clientName: string;
  weekday: string;
  dateLabel: string;
  time: string;
}) => `${row.clientName}, ${row.weekday}, ${row.dateLabel}, ${row.time}`;

export default async function ClientPage({
  params,
  searchParams,
}: PageProps<"/klienci/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const loaded = loadVisitTableParams(await searchParams);
  // A client's history reads latest first (the table's past periods do).
  const tableParams =
    loaded.zakres === "nadchodzace"
      ? { ...loaded, zakres: "minione" as const }
      : loaded;
  const [card, avatars] = await Promise.all([
    loadClientCard(id, tableParams),
    specialistAvatars(),
  ]);
  if (!card) notFound();
  const path = `/klienci/${id}`;

  return (
    <div className="space-y-4">
      <PageTitle>{card.client.name}</PageTitle>
      <ClientCard
        cancelled={card.client.cancelled}
        edit={
          // Removed (RODO): nothing left to change.
          card.client.email.endsWith("@anonim.invalid") ? null : (
            <div className="flex flex-wrap gap-2">
              <EditClientButton
                action={updateClientAction}
                clientId={card.client.id}
                details={{
                  firstName: card.client.firstName,
                  lastName: card.client.lastName,
                  email: card.client.email,
                  phone: card.client.phone,
                  notes: card.client.notes,
                }}
              />
              <MergeClientButton
                clientId={card.client.id}
                duplicates={card.duplicates}
                email={card.client.email}
                name={card.client.name}
              />
              <ForgetClientButton
                clientId={card.client.id}
                name={card.client.name}
              />
            </div>
          )
        }
        notes={card.client.notes}
        row={card.row}
      />
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <VisitTable
            actions={Object.fromEntries(
              card.visits.map((row) => [
                row.id,
                <VisitActions
                  key={row.id}
                  visit={{
                    id: row.id,
                    reference: row.reference,
                    label: visitLabel(row),
                    phone: row.phone,
                    email: row.email,
                    refundableMinor: row.refundableMinor,
                    currencyCode: row.currencyCode,
                    cancellable: row.cancellable,
                    movable: row.movable,
                    date: row.date,
                  }}
                />,
              ]),
            )}
            caption="Wizyty klienta"
            specialistAvatars={avatars}
            params={tableParams}
            path={path}
            rows={card.visits}
            showPayment
            showSpecialist
            total={card.total}
          />
        </div>
        {card.open ? (
          <VisitPanel
            closeHref={visitPanelCloseHref(path, tableParams)}
            events={card.open.events}
            closing={card.open.closing}
            intake={card.open.intake}
            row={card.open.row}
            specialistAvatar={avatars[card.open.row.specialistId]}
            tab={tableParams.karta}
            tabs={visitPanelTabs(path, tableParams)}
            toolbar={
              <CentreVisitToolbar
                label={visitLabel(card.open.row)}
                row={card.open.row}
              />
            }
          />
        ) : null}
      </div>
    </div>
  );
}
