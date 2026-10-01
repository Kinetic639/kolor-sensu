import type { NotificationView } from "@repo/scheduling";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PortalNotifications } from "./portal-notifications";

// The bell in a portal's header (R13): new bookings, cancellations, moves
// and refunds; opening it reads them, a notification opens its visit.

const items: NotificationView[] = [
  {
    id: 6,
    title: "Nowa wizyta",
    description:
      "Jan Kowalski · konsultacja psychologiczna · sob. 03.10, 11:00 · Michał Stępień",
    tone: "success",
    icon: "new",
    href: "/kalendarz?data=2026-10-03&wizyta=visit-1",
    when: "dziś, 10:05",
    unread: true,
  },
  {
    id: 5,
    title: "Klient odwołał wizytę",
    description:
      "Ewa Nowak · konsultacja psychologiczna · pt. 09.10, 10:00 · Anna Kłobuchowska · Do zwrotu: 200 zł",
    tone: "danger",
    icon: "cancelled",
    href: "/kalendarz?data=2026-10-09&wizyta=visit-2",
    when: "dziś, 09:40",
    unread: true,
  },
  {
    id: 4,
    title: "Nowa rezerwacja, płatność później",
    description:
      "Piotr Zieliński · terapia par · pon. 12.10, 17:00 · Michał Stępień",
    tone: "info",
    icon: "reserved",
    href: "/kalendarz?data=2026-10-12&wizyta=visit-3",
    when: "wczoraj, 21:30",
    unread: false,
  },
  {
    id: 3,
    title: "Centrum przesunęło wizytę",
    description:
      "Anna Wiśniewska · konsultacja psychologiczna · wt. 06.10, 12:00 · wcześniej pon. 05.10, 10:00 · Prośba klienta",
    tone: "info",
    icon: "moved",
    href: "/kalendarz?data=2026-10-06&wizyta=visit-4",
    when: "28.09, 09:00",
    unread: false,
  },
  {
    id: 2,
    title: "Zwrot pieniędzy: 50 zł",
    description: "Ewa Nowak · konsultacja psychologiczna · pt. 09.10, 10:00",
    tone: "info",
    icon: "refund",
    href: "/kalendarz?data=2026-10-09&wizyta=visit-2",
    when: "27.09, 15:12",
    unread: false,
  },
];

const meta = {
  title: "Portal/Notifications inbox",
  component: PortalNotifications,
  parameters: { layout: "centered", nextjs: { appDirectory: true } },
  args: { items, unreadCount: 2, markRead: fn(async () => 2) },
} satisfies Meta<typeof PortalNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two new: opening the inbox reads them (the dots stay while it is open). */
export const WithNew: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", {
        name: "Powiadomienia, nowe: 2",
      }),
    );
    const inbox = within(document.body).getByRole("dialog");
    await expect(inbox).toHaveTextContent("Klient odwołał wizytę");
    await expect(args.markRead).toHaveBeenCalled();
  },
};

/** Nothing yet. */
export const Empty: Story = {
  args: { items: [], unreadCount: 0 },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Powiadomienia" }),
    );
    await expect(
      within(document.body).getByText(/Brak powiadomień/),
    ).toBeInTheDocument();
  },
};

/** On a phone. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: WithNew.play,
};
