import { resendPaymentLinkAction } from "@/features/calendar/actions";
import { CancelVisitButton } from "@/features/visits/cancel-visit";
import { loadAdminVisits } from "@/features/visits/loaders";
import { VisitActions } from "@/features/visits/visit-actions";
import { PageTitle } from "@repo/ui/portal-content";
import {
  loadVisitTableParams,
  ResendPaymentLinkButton,
  VisitPanel,
  VisitTable,
  VisitTableToolbar,
  visitPanelCloseHref,
  visitPanelTabs,
  visitTableHref,
} from "@repo/ui/visit-table";
import type { Route } from "next";
import Link from "next/link";

// Rezerwacje (R9): the bookings table. The database searches,
// filters, sorts and pages; the address holds the state, including the
// visit open in the side panel (?wizyta=…). The centre cancels from the
// row's menu or the panel, with the money back. The calendar views come in
// stage K.

const PATH = "/rezerwacje";

const visitLabel = (row: {
  clientName: string;
  weekday: string;
  dateLabel: string;
  time: string;
}) => `${row.clientName}, ${row.weekday}, ${row.dateLabel}, ${row.time}`;

export default async function BookingsPage({
  searchParams,
}: PageProps<"/rezerwacje">) {
  const params = loadVisitTableParams(await searchParams);
  const { rows, total, refundsToSettle, open, filters } =
    await loadAdminVisits(params);

  return (
    <div className="space-y-4">
      <PageTitle>Rezerwacje</PageTitle>
      {refundsToSettle > 0 && params.platnosc !== "do-zwrotu" ? (
        <p
          className="rounded-[var(--radius-control)] border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--text)]"
          role="status"
        >
          {refundsToSettle === 1
            ? "1 odwołana wizyta czeka na zwrot, którego Stripe nie zlecił."
            : `${refundsToSettle} odwołane wizyty czekają na zwrot, którego Stripe nie zlecił.`}{" "}
          <Link
            className="font-semibold text-[var(--primary)] underline underline-offset-4"
            href={
              visitTableHref(PATH, params, {
                platnosc: "do-zwrotu",
                zakres: "wszystkie",
                strona: 1,
              }) as Route
            }
          >
            Pokaż
          </Link>
        </p>
      ) : null}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <VisitTable
            actions={Object.fromEntries(
              rows.map((row) => [
                row.id,
                <VisitActions
                  key={row.id}
                  visit={{
                    id: row.id,
                    reference: row.reference,
                    label: visitLabel(row),
                    phone: row.phone,
                    email: row.email,
                    paid: row.paid,
                    cancellable: row.cancellable,
                  }}
                />,
              ]),
            )}
            params={params}
            path={PATH}
            rows={rows}
            showPayment
            showSpecialist
            toolbar={
              <VisitTableToolbar
                params={params}
                path={PATH}
                rooms={filters.rooms}
                services={filters.services}
                showPayments
                specialists={filters.specialists}
              />
            }
            total={total}
          />
        </div>
        {open ? (
          <VisitPanel
            closeHref={visitPanelCloseHref(PATH, params)}
            events={open.events}
            row={open.row}
            tab={params.karta}
            tabs={visitPanelTabs(PATH, params)}
            toolbar={
              <>
                {open.row.resendable ? (
                  <ResendPaymentLinkButton
                    action={resendPaymentLinkAction}
                    visitId={open.row.id}
                  />
                ) : null}
                {open.row.cancellable ? (
                  <CancelVisitButton
                    visit={{
                      id: open.row.id,
                      reference: open.row.reference,
                      label: visitLabel(open.row),
                      paid: open.row.paid,
                      email: open.row.email,
                    }}
                  />
                ) : null}
              </>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
