import { VisitActions } from "@/features/visits/visit-actions";
import { loadAdminVisits } from "@/features/visits/loaders";
import { PageTitle } from "@repo/ui/portal-content";
import {
  loadVisitTableParams,
  VisitTable,
  VisitTableToolbar,
  visitTableHref,
} from "@repo/ui/visit-table";
import type { Route } from "next";
import Link from "next/link";

// Kalendarz i rezerwacje (R9): the bookings table. The database searches,
// filters, sorts and pages; the address holds the state. The centre cancels
// from here, with the money back. The calendar views come in stage K.

const PATH = "/kalendarz";

export default async function CalendarPage({
  searchParams,
}: PageProps<"/kalendarz">) {
  const params = loadVisitTableParams(await searchParams);
  const { rows, total, refundsToSettle, specialists } =
    await loadAdminVisits(params);

  return (
    <div className="space-y-4">
      <PageTitle>Kalendarz i rezerwacje</PageTitle>
      {refundsToSettle > 0 && params.status !== "do-zwrotu" ? (
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
                status: "do-zwrotu",
                zakres: "wszystkie",
                strona: 1,
              }) as Route
            }
          >
            Pokaż
          </Link>
        </p>
      ) : null}
      <VisitTable
        actions={Object.fromEntries(
          rows.map((row) => [
            row.id,
            <VisitActions
              key={row.id}
              visit={{
                id: row.id,
                reference: row.reference,
                label: `${row.clientName}, ${row.weekday}, ${row.dateLabel}, ${row.time}`,
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
            showRefunds
            specialists={specialists}
          />
        }
        total={total}
      />
    </div>
  );
}
