import type { Meta, StoryObj } from "@storybook/react";
import { Mail, Phone, XCircle } from "lucide-react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, fn, within } from "storybook/test";
import {
  RowActionButton,
  RowActionLink,
  RowActions,
  RowActionSeparator,
} from "../row-actions";
import { IconButton } from "../icon-action";
import { VisitPanel } from "./visit-panel";
import { VisitTable, VisitTableToolbar } from "./visit-table";
import {
  adminRows,
  panelTabs,
  sampleEvents,
  sampleRooms,
  sampleServices,
  sampleSpecialists,
  specialistRows,
  tableParams,
} from "./visit-table.samples";

// The bookings table as the portals show it: search and filters with the
// page count above, one dense line a visit, the reference and the "⋮"
// menu stuck to the edges, the pages below.

const cancel = fn();

function BookingsTable({
  query,
  admin,
  empty = false,
  open = false,
  history = false,
}: {
  query: string;
  admin: boolean;
  empty?: boolean;
  /** The first visit open in the side panel. */
  open?: boolean;
  /** The panel on its history tab. */
  history?: boolean;
}) {
  const rows = empty ? [] : admin ? adminRows : specialistRows;
  const params = { ...tableParams(query), wizyta: open ? rows[0]!.id : null };
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="flex max-w-7xl items-start gap-4">
        <div className="min-w-0 flex-1">
          <VisitTable
            actions={Object.fromEntries(
              rows.map((row) => [
                row.id,
                <RowActions key={row.id} label={row.reference}>
                  {row.phone ? (
                    <RowActionLink
                      href={`tel:${row.phone}`}
                      icon={<Phone aria-hidden="true" className="size-4" />}
                    >
                      Zadzwoń
                    </RowActionLink>
                  ) : null}
                  {row.email ? (
                    <RowActionLink
                      href={`mailto:${row.email}`}
                      icon={<Mail aria-hidden="true" className="size-4" />}
                    >
                      Napisz e-mail
                    </RowActionLink>
                  ) : null}
                  {admin && row.cancellable ? (
                    <>
                      <RowActionSeparator />
                      <RowActionButton
                        destructive
                        icon={<XCircle aria-hidden="true" className="size-4" />}
                        onSelect={cancel}
                      >
                        Odwołaj wizytę
                      </RowActionButton>
                    </>
                  ) : null}
                </RowActions>,
              ]),
            )}
            params={params}
            path="/kalendarz"
            rows={rows}
            showPayment={admin}
            showSpecialist={admin}
            toolbar={
              <VisitTableToolbar
                params={params}
                path="/kalendarz"
                rooms={sampleRooms}
                services={sampleServices}
                showPayments={admin}
                specialists={admin ? sampleSpecialists : undefined}
              />
            }
            total={empty ? 0 : admin ? 42 : rows.length}
          />
        </div>
        {open ? (
          <VisitPanel
            closeHref="/kalendarz"
            events={sampleEvents}
            row={rows[0]!}
            tab={history ? "historia" : "szczegoly"}
            tabs={panelTabs}
            toolbar={
              admin ? (
                <IconButton
                  destructive
                  icon={<XCircle aria-hidden="true" />}
                  label="Odwołaj wizytę"
                  onClick={cancel}
                />
              ) : null
            }
          />
        ) : null}
      </div>
    </NuqsTestingAdapter>
  );
}

const meta = {
  title: "Portal/Bookings table",
  component: BookingsTable,
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookingsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The admin: everyone's visits, payments, the "⋮" menu, 42 in all. */
export const Admin: Story = {
  args: { query: "strona=2&wierszy=10", admin: true },
  play: async ({ canvas, canvasElement, userEvent }) => {
    await expect(canvas.getByText("11–14 z 42 · strona 2 z 5")).toBeVisible();
    await expect(
      canvas.getByRole("columnheader", { name: /Data/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(
      canvas.getByRole("button", { name: "Akcje: 3010-017" }),
    );
    // The menu opens in a portal, outside the story.
    const menu = within(canvasElement.ownerDocument.body);
    await userEvent.click(
      await menu.findByRole("menuitem", { name: "Odwołaj wizytę" }),
    );
    await expect(cancel).toHaveBeenCalled();
  },
};

/** Sorted by client, latest first, filtered to cancelled visits. */
export const SortedAndFiltered: Story = {
  args: {
    query: "q=kowal&status=odwolane&sort=klient&kierunek=malejaco",
    admin: true,
  },
};

/** A specialist: their own visits, no payments, contact in the menu. */
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

/** A visit open in the side panel beside the table. */
export const VisitOpen: Story = {
  args: { query: "", admin: true, open: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("complementary", { name: "Jan Kowalski" }),
    ).toBeVisible();
  },
};

/** Days of one's own and more filters, highlighted. */
export const MoreFilters: Story = {
  args: {
    query: "od=2030-10-01&do=2030-10-07&platnosc=oplacone&miejsce=online",
    admin: true,
  },
};

/** The open visit's history: every event, who did it and when. */
export const VisitHistory: Story = {
  args: { query: "", admin: true, open: true, history: true },
};
