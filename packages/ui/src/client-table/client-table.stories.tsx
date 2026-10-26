import type { ClientRow } from "@repo/scheduling";
import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, fn, userEvent, within } from "storybook/test";
import { adminRows } from "../visit-table/visit-table.samples";
import { ClientCard } from "./client-card";
import { ClientFilterBar } from "./client-filter-bar";
import { ClientPanel } from "./client-panel";
import { ClientTable } from "./client-table";
import { defaultClientLayout } from "./columns";
import { EditClientButton } from "./edit-client";
import {
  clientPanelCloseHref,
  clientPanelTabs,
  loadClientTableParams,
} from "./params";

// The centre's clients (R15) on the portals' table, as the bookings: the
// filters and the search in one bar, a 30 px line a client with
// the name pinned, the columns chosen in the last header, a client open in
// the side panel; and a client's card with the form that corrects them.

const rows: ClientRow[] = [
  {
    id: "c1",
    name: "Jan Kowalski",
    listName: "Kowalski Jan",
    email: "jan@example.invalid",
    phone: "600 100 200",
    visits: "6",
    upcoming: "1 nadchodząca",
    lastVisit: "20.09.2026",
    nextVisit: "pon. 05.10.2026, 10:00",
    paid: "1 200 zł",
    since: "Klient od 01.06.2026",
    href: "/klienci/c1",
    notes: "Woli popołudnia.",
  },
  {
    id: "c2",
    name: "Ewa Nowak",
    listName: "Nowak Ewa",
    email: "ewa.nowak@example.invalid",
    phone: null,
    visits: "1",
    upcoming: null,
    lastVisit: "12.09.2026",
    nextVisit: "—",
    paid: "200 zł",
    since: "Klient od 10.09.2026",
    href: "/klienci/c2",
    notes: null,
  },
  {
    id: "c3",
    name: "Piotr Zieliński",
    listName: "Zieliński Piotr",
    email: "piotr@example.invalid",
    phone: "+48 501 222 333",
    visits: "2",
    upcoming: "2 nadchodzące",
    lastVisit: "—",
    nextVisit: "wt. 06.10.2026, 17:00",
    paid: "0 zł",
    since: "Klient od 30.09.2026",
    href: "/klienci/c3",
    notes: null,
  },
];

const save = fn(async () => ({ ok: true as const, upcomingUpdated: 1 }));

function Clients({
  query,
  empty = false,
  open = false,
  visits = false,
}: {
  query: string;
  empty?: boolean;
  /** The first client open in the side panel. */
  open?: boolean;
  /** The panel on its visits tab. */
  visits?: boolean;
}) {
  const shown = empty ? [] : rows;
  const opened = rows[0]!;
  const params = {
    ...loadClientTableParams(new URLSearchParams(query)),
    klient: open ? opened.id : null,
  };
  const total = shown.length;
  const layout = defaultClientLayout();
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="flex h-[36rem] border border-[var(--border)]">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ClientTable
            columns={layout}
            columnsCookie="ks_cols_storybook_klienci"
            params={params}
            path="/klienci"
            rows={shown}
            toolbar={
              <ClientFilterBar
                order={layout.filter((c) => c.shown).map((c) => c.id)}
              />
            }
            total={total}
            widthsCookie="ks_widths_storybook_klienci"
          />
        </div>
        {open ? (
          <ClientPanel
            cancelled={1}
            closeHref={clientPanelCloseHref("/klienci", params)}
            edit={
              <EditClientButton
                action={save}
                clientId={opened.id}
                details={{
                  firstName: "Jan",
                  lastName: "Kowalski",
                  email: opened.email,
                  phone: opened.phone,
                  notes: opened.notes,
                }}
              />
            }
            notes={opened.notes}
            row={opened}
            tab={visits ? "wizyty" : "szczegoly"}
            tabs={clientPanelTabs("/klienci", params)}
            visits={adminRows.slice(0, 3)}
          />
        ) : null}
      </div>
    </NuqsTestingAdapter>
  );
}

const meta = {
  title: "Portal/Clients",
  component: Clients,
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
} satisfies Meta<typeof Clients>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Latest visit first; a name opens the client beside the list. */
export const List: Story = {
  args: { query: "" },
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "Klienci" });
    await expect(
      within(table).getByRole("link", { name: "Kowalski Jan" }),
    ).toHaveAttribute("href", "/klienci?klient=c1");
    await expect(
      canvas.getByRole("columnheader", { name: /Ostatnia wizyta/ }),
    ).toHaveAttribute("aria-sort", "descending");
  },
};

/** Filtered to those with a visit to come, the soonest first. */
export const WithUpcomingVisit: Story = {
  args: { query: "nadchodzaca=jest&sort=najblizsza" },
};

/** Nobody matches the search and filters. */
export const NothingFound: Story = {
  args: { query: "q=xyz&dodany=ten-miesiac", empty: true },
};

export const Mobile: Story = {
  args: { query: "" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** A client open in the side panel: contact, numbers, the note. */
export const ClientOpen: Story = {
  args: { query: "", open: true },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("complementary", { name: "Jan Kowalski" }),
    ).toBeVisible();
  },
};

/** The open client's visits, each leading to its booking. */
export const ClientVisits: Story = {
  args: { query: "", open: true, visits: true },
};

/** A client's own page (/klienci/[id]), with the form that corrects them. */
export const Card: Story = {
  args: { query: "" },
  render: () => (
    <ClientCard
      cancelled={1}
      edit={
        <EditClientButton
          action={save}
          clientId="c1"
          details={{
            firstName: "Jan",
            lastName: "Kowalski",
            email: "jan@example.invalid",
            phone: "600 100 200",
            notes: "Woli popołudnia. Prosi o przypomnienie SMS.",
          }}
        />
      }
      notes={"Woli popołudnia.\nProsi o przypomnienie SMS."}
      row={rows[0]!}
    />
  ),
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Edytuj dane" }),
    );
    const dialog = within(document.body).getByRole("dialog");
    await expect(within(dialog).getByLabelText("E-mail")).toHaveValue(
      "jan@example.invalid",
    );
  },
};
