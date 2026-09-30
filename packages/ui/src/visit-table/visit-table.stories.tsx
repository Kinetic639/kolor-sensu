import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect } from "storybook/test";
import { Button } from "../button";
import { VisitTable, VisitTableToolbar } from "./visit-table";
import {
  adminRows,
  sampleSpecialists,
  specialistRows,
  tableParams,
} from "./visit-table.samples";

// The bookings table as the portals show it: the toolbar above, the page
// of visits, the pages below.

function BookingsTable({
  query,
  admin,
  empty = false,
}: {
  query: string;
  admin: boolean;
  empty?: boolean;
}) {
  const params = tableParams(query);
  const rows = empty ? [] : admin ? adminRows : specialistRows;
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="max-w-6xl space-y-4">
        <VisitTableToolbar
          params={params}
          path="/kalendarz"
          showRefunds={admin}
          specialists={admin ? sampleSpecialists : undefined}
        />
        <VisitTable
          actions={
            admin
              ? Object.fromEntries(
                  rows
                    .filter((row) => row.cancellable)
                    .map((row) => [
                      row.id,
                      <Button key={row.id} size="sm" variant="secondary">
                        Odwołaj
                      </Button>,
                    ]),
                )
              : undefined
          }
          params={params}
          path="/kalendarz"
          rows={rows}
          showPayment={admin}
          showSpecialist={admin}
          total={empty ? 0 : admin ? 42 : rows.length}
        />
      </div>
    </NuqsTestingAdapter>
  );
}

const meta = {
  title: "Portal/Bookings table",
  component: BookingsTable,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof BookingsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The admin: everyone's visits, payments, cancelling, 42 in all. */
export const Admin: Story = {
  args: { query: "strona=2&wierszy=10", admin: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("11–14 z 42")).toBeVisible();
    await expect(
      canvas.getByRole("columnheader", { name: /Termin/ }),
    ).toHaveAttribute("aria-sort", "ascending");
  },
};

/** Sorted by client, latest first, filtered to cancelled visits. */
export const SortedAndFiltered: Story = {
  args: {
    query: "q=kowal&status=odwolane&sort=klient&kierunek=malejaco",
    admin: true,
  },
};

/** A specialist: their own visits, no payments, no actions. */
export const Specialist: Story = {
  args: { query: "", admin: false },
};

export const NothingFound: Story = {
  args: { query: "q=zzz", admin: true, empty: true },
};

export const Mobile: Story = {
  args: { query: "", admin: true },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
