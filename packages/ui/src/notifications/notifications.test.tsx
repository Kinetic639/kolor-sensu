import { notificationView } from "@repo/scheduling";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRows } from "../visit-table/visit-table.samples";
import { NotificationsBell } from "./bell";
import { NotificationsProvider } from "./context";
import { NotificationsPanel } from "./panel";
import {
  sampleNotifications,
  sampleUnreadCount,
} from "./notifications.samples";

const refresh = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push }) }));

const markRead = vi.fn().mockResolvedValue(true);
const markUnread = vi.fn().mockResolvedValue(true);
const markAllRead = vi.fn().mockResolvedValue(3);
// The booking as it is now: its specialist, place and payment.
const booking = adminRows.find((row) => row.payment)!;
const loadVisit = vi.fn().mockResolvedValue({ row: booking, avatar: null });

beforeEach(() => {
  for (const fn of [
    markRead,
    markUnread,
    markAllRead,
    loadVisit,
    refresh,
    push,
  ]) {
    fn.mockClear();
  }
});

function Inbox({ open = true }: { open?: boolean }) {
  return (
    <NotificationsProvider defaultOpen={open}>
      <NotificationsBell
        items={sampleNotifications}
        unreadCount={sampleUnreadCount}
      />
      <NotificationsPanel
        items={sampleNotifications}
        markAllRead={markAllRead}
        markRead={markRead}
        loadVisit={loadVisit}
        markUnread={markUnread}
      />
    </NotificationsProvider>
  );
}

const panel = () => screen.getByRole("dialog", { name: "Powiadomienia" });

describe("the notifications panel", () => {
  it("the bell slides the drawer in, over the page, with the count", async () => {
    render(<Inbox open={false} />);
    const bell = screen.getByRole("button", {
      name: "Powiadomienia, nowe: 3",
    });
    expect(bell).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("dialog", { name: "Powiadomienia" }),
    ).not.toBeInTheDocument();
    await userEvent.click(bell);
    expect(bell).toHaveAttribute("aria-expanded", "true");
    // A dialog: the page behind it is out of reach until it closes.
    expect(panel()).toHaveAttribute("data-state", "open");
    // Focus on the drawer, not a button (its tooltip would show unasked).
    expect(panel()).toHaveFocus();
    // The title with how many are new beside it.
    expect(within(panel()).getByLabelText("nowe: 3")).toHaveTextContent("(3)");
    expect(
      screen.queryByRole("button", { name: "Powiadomienia, nowe: 3" }),
    ).not.toBeInTheDocument();
  });

  it("new ones first; all of them by day, short, the facts as icons", async () => {
    render(<Inbox />);
    const list = within(panel());
    expect(list.getByRole("tab", { name: /Nowe/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(list.getAllByRole("article")).toHaveLength(3);
    await userEvent.click(list.getByRole("tab", { name: "Wszystkie" }));
    expect(list.getAllByRole("article")).toHaveLength(7);
    expect(list.getByText("Dziś")).toBeInTheDocument();
    expect(list.getByText("Wczoraj")).toBeInTheDocument();
    const first = list.getAllByRole("article")[0]!;
    expect(first).toHaveTextContent("Nowa rezerwacja");
    expect(first).toHaveTextContent("Michał Stępień · pt. 09.10, 10:00");
    expect(first).toHaveTextContent("2610-027");
    expect(
      within(first).getByRole("img", { name: "Płatność później" }),
    ).toBeInTheDocument();
    expect(
      within(first).getByRole("img", { name: "Wizyta online" }),
    ).toBeInTheDocument();
  });

  it("opened, it shows the booking and reads it", async () => {
    render(<Inbox />);
    const first = within(panel()).getAllByRole("article")[0]!;
    const toggle = within(first).getByRole("button", {
      name: /Nowa rezerwacja/,
    });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(first).toHaveTextContent("Psychoterapia indywidualna");
    // The booking as it is now, asked for once.
    expect(loadVisit).toHaveBeenCalledWith("visit-1");
    expect(
      await within(first).findByText(booking.specialistName),
    ).toBeVisible();
    expect(first).toHaveTextContent(booking.place);
    expect(first).toHaveTextContent(booking.payment!.label);
    // The number leads to the booking; no button for it below.
    expect(
      within(first).getByRole("link", { name: "Rezerwacja 2610-027" }),
    ).toHaveAttribute(
      "href",
      "/rezerwacje?zakres=wszystkie&q=2610-027&wizyta=visit-1",
    );
    expect(
      within(first).queryByRole("link", { name: /Otwórz rezerwację/ }),
    ).not.toBeInTheDocument();
    expect(markRead).toHaveBeenCalledWith(1);
    expect(
      screen.getByRole("button", {
        name: "Powiadomienia, nowe: 2",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("the envelope reads it, or makes it new again", async () => {
    render(<Inbox />);
    await userEvent.click(
      within(panel()).getByRole("tab", { name: "Wszystkie" }),
    );
    const [first, , , fourth] = within(panel()).getAllByRole("article");
    await userEvent.click(
      within(first!).getByRole("button", { name: "Oznacz jako przeczytane" }),
    );
    expect(markRead).toHaveBeenCalledWith(1);
    expect(
      within(first!).getByRole("button", {
        name: "Oznacz jako nieprzeczytane",
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(fourth!).getByRole("button", {
        name: "Oznacz jako nieprzeczytane",
      }),
    );
    expect(markUnread).toHaveBeenCalledWith(4);
    expect(
      screen.getByRole("button", {
        name: "Powiadomienia, nowe: 3",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("all read at once; then the new tab says so", async () => {
    render(<Inbox />);
    await userEvent.click(
      within(panel()).getByRole("button", {
        name: "Oznacz wszystkie jako przeczytane",
      }),
    );
    expect(markAllRead).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Powiadomienia", hidden: true }),
    ).toBeInTheDocument();
    // Read here stay in "Nowe" until it is opened again.
    expect(within(panel()).getAllByRole("article")).toHaveLength(3);
    await userEvent.click(
      within(panel()).getByRole("tab", { name: "Wszystkie" }),
    );
    await userEvent.click(within(panel()).getByRole("tab", { name: /Nowe/ }));
    expect(within(panel()).getByText("Wszystko przeczytane")).toBeVisible();
  });

  it("Escape folds the open one, then closes; so does its close button", async () => {
    render(<Inbox />);
    const toggle = within(panel()).getAllByRole("button", {
      name: /Nowa rezerwacja/,
    })[0]!;
    await userEvent.click(toggle);
    await userEvent.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel()).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Powiadomienia" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: /^Powiadomienia/ }),
    );
    await userEvent.click(
      within(panel()).getByRole("button", { name: "Zamknij powiadomienia" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Powiadomienia" }),
    ).not.toBeInTheDocument();
  });
});

describe("a profile sent for review", () => {
  it("whose, leading to their profile; opened, no booking to load", async () => {
    const [profile] = [
      notificationView(
        {
          id: 50,
          kind: "profile_submitted",
          actor: "specialist",
          appointmentId: null,
          createdAt: "2026-10-03T10:20:00Z",
          readAt: null,
          details: {
            reference: null,
            startsAt: null,
            mode: null,
            clientName: null,
            serviceName: null,
            specialistName: "Anna Kłobuchowska",
            specialistId: "anna",
            fromStartsAt: null,
            reason: null,
            refundMinor: null,
            refundDueMinor: null,
            priceMinor: null,
            currencyCode: null,
          },
        },
        {
          timeZone: "Europe/Warsaw",
          portal: "admin",
          now: new Date("2026-10-03T10:30:00Z"),
        },
      ),
    ];
    render(
      <NotificationsProvider defaultOpen>
        <NotificationsPanel
          items={[profile!]}
          loadVisit={loadVisit}
          markAllRead={markAllRead}
          markRead={markRead}
          markUnread={markUnread}
        />
      </NotificationsProvider>,
    );
    const row = within(panel()).getByRole("article");
    expect(row).toHaveTextContent("Profil do weryfikacji");
    expect(row).toHaveTextContent("Anna Kłobuchowska");
    expect(
      within(row).getByRole("link", { name: "Profil: Anna Kłobuchowska" }),
    ).toHaveAttribute("href", "/specjalisci/anna?zakladka=profil");
    await userEvent.click(
      within(row).getByRole("button", { name: /Profil do weryfikacji/ }),
    );
    expect(loadVisit).not.toHaveBeenCalled();
  });
});
