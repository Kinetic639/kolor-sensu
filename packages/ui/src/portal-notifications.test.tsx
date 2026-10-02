import type { NotificationView } from "@repo/scheduling";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PortalNotifications } from "./portal-notifications";

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const items: NotificationView[] = [
  {
    id: 2,
    title: "Klient odwołał wizytę",
    reference: "2610-004",
    description: "Jan Kowalski · Konsultacja · sob. 03.10, 11:00",
    tone: "danger",
    icon: "cancelled",
    href: "/rezerwacje?zakres=wszystkie&q=2610-004&wizyta=visit-1",
    when: "dziś, 10:05",
    unread: true,
  },
  {
    id: 1,
    title: "Nowa wizyta",
    reference: null,
    description: "Ewa Nowak · Konsultacja · pt. 02.10, 09:00",
    tone: "success",
    icon: "new",
    href: null,
    when: "wczoraj, 21:30",
    unread: false,
  },
];

beforeEach(() => {
  router.push.mockReset();
  router.refresh.mockReset();
});

function bell(unreadCount = 1, list = items) {
  const markRead = vi.fn().mockResolvedValue(true);
  const markAllRead = vi.fn().mockResolvedValue(1);
  render(
    <PortalNotifications
      items={list}
      markAllRead={markAllRead}
      markRead={markRead}
      unreadCount={unreadCount}
    />,
  );
  return { markRead, markAllRead };
}

const openBell = (name: string | RegExp) =>
  userEvent.click(screen.getByRole("button", { name }));

describe("PortalNotifications", () => {
  it("says how many are new; opening marks nothing", async () => {
    const { markRead, markAllRead } = bell();
    await openBell("Powiadomienia, nowe: 1");
    expect(screen.getByRole("dialog")).toHaveTextContent("Nowe: 1");
    expect(screen.getByText("Klient odwołał wizytę")).toBeInTheDocument();
    expect(screen.getByText("Nr 2610-004")).toBeInTheDocument();
    expect(markRead).not.toHaveBeenCalled();
    expect(markAllRead).not.toHaveBeenCalled();
  });

  it("its button marks one read, at once, then reloads", async () => {
    const { markRead } = bell();
    await openBell("Powiadomienia, nowe: 1");
    await userEvent.click(
      screen.getByRole("button", { name: "Oznacz jako przeczytane" }),
    );
    expect(markRead).toHaveBeenCalledWith(2);
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Nowe: 1");
    expect(
      screen.queryByRole("button", { name: "Oznacz jako przeczytane" }),
    ).toBeNull();
    await vi.waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("opening one marks it read and goes to its booking", async () => {
    const { markRead } = bell();
    await openBell("Powiadomienia, nowe: 1");
    await userEvent.click(
      screen.getByRole("button", { name: /Klient odwołał wizytę/ }),
    );
    expect(markRead).toHaveBeenCalledWith(2);
    expect(router.push).toHaveBeenCalledWith(
      "/rezerwacje?zakres=wszystkie&q=2610-004&wizyta=visit-1",
    );
  });

  it("marks them all read from the header", async () => {
    const { markAllRead } = bell();
    await openBell("Powiadomienia, nowe: 1");
    await userEvent.click(
      screen.getByRole("button", {
        name: "Oznacz wszystkie jako przeczytane",
      }),
    );
    expect(markAllRead).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Nowe:");
    expect(
      screen.queryByRole("button", { name: "Oznacz jako przeczytane" }),
    ).toBeNull();
  });

  it("nothing new: nothing to mark read", async () => {
    bell(0, []);
    await openBell("Powiadomienia");
    expect(screen.getByText(/Brak powiadomień/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Oznacz wszystkie jako przeczytane",
      }),
    ).toBeNull();
  });
});
