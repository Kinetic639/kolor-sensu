import type { ClientRow } from "@repo/scheduling";
import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, fn, userEvent, within } from "storybook/test";
import { ClientCard } from "./client-card";
import { ClientTable } from "./client-table";
import { EditClientButton } from "./edit-client";
import { loadClientTableParams } from "./params";

// The centre's clients (R15): the list, and a client's card with the form
// that corrects their details.

const rows: ClientRow[] = [
  {
    id: "c1",
    name: "Jan Kowalski",
    email: "jan@example.invalid",
    phone: "600 100 200",
    visits: "6",
    upcoming: "1 nadchodząca",
    lastVisit: "20.09.2026",
    nextVisit: "pon. 05.10.2026, 10:00",
    paid: "1 200 zł",
    since: "Klient od 01.06.2026",
    href: "/klienci/c1",
  },
  {
    id: "c2",
    name: "Ewa Nowak",
    email: "ewa.nowak@example.invalid",
    phone: null,
    visits: "1",
    upcoming: null,
    lastVisit: "12.09.2026",
    nextVisit: "—",
    paid: "200 zł",
    since: "Klient od 10.09.2026",
    href: "/klienci/c2",
  },
  {
    id: "c3",
    name: "Piotr Zieliński",
    email: "piotr@example.invalid",
    phone: "+48 501 222 333",
    visits: "2",
    upcoming: "2 nadchodzące",
    lastVisit: "—",
    nextVisit: "wt. 06.10.2026, 17:00",
    paid: "0 zł",
    since: "Klient od 30.09.2026",
    href: "/klienci/c3",
  },
];

const meta = {
  title: "Portal/Clients",
  component: ClientTable,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  decorators: [
    (Story) => (
      <NuqsTestingAdapter>
        <Story />
      </NuqsTestingAdapter>
    ),
  ],
  args: {
    path: "/klienci",
    params: loadClientTableParams({}),
    rows,
    total: rows.length,
  },
} satisfies Meta<typeof ClientTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Latest visit first; a name opens the client's card. */
export const List: Story = {
  play: async ({ canvasElement }) => {
    const table = within(canvasElement).getByRole("table", { name: "Klienci" });
    await expect(
      within(table).getByRole("link", { name: "Jan Kowalski" }),
    ).toHaveAttribute("href", "/klienci/c1");
  },
};

/** Nobody matches the search. */
export const NoneFound: Story = {
  args: { rows: [], total: 0, params: loadClientTableParams({ q: "xyz" }) },
};

/** On a phone: the table scrolls sideways. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};

/** A client's card, with the form that corrects their details. */
export const Card: Story = {
  render: () => (
    <ClientCard
      cancelled={1}
      edit={
        <EditClientButton
          action={fn(async () => ({ ok: true as const, upcomingUpdated: 1 }))}
          clientId="c1"
          details={{
            name: "Jan Kowalski",
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
