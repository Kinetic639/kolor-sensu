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
    description: "Jan Kowalski · Konsultacja · sob. 03.10, 11:00",
    tone: "danger",
    icon: "cancelled",
    href: "/kalendarz?data=2026-10-03&wizyta=visit-1",
    when: "dziś, 10:05",
    unread: true,
  },
  {
    id: 1,
    title: "Nowa wizyta",
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

describe("PortalNotifications", () => {
  it("says how many are new; opening reads them and refreshes", async () => {
    const markRead = vi.fn().mockResolvedValue(1);
    render(
      <PortalNotifications items={items} markRead={markRead} unreadCount={1} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Powiadomienia, nowe: 1" }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("Nowe: 1");
    expect(screen.getByText("Klient odwołał wizytę")).toBeInTheDocument();
    expect(markRead).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it("a notification opens its visit", async () => {
    render(
      <PortalNotifications items={items} markRead={vi.fn()} unreadCount={0} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Powiadomienia" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Klient odwołał wizytę/ }),
    );
    expect(router.push).toHaveBeenCalledWith(
      "/kalendarz?data=2026-10-03&wizyta=visit-1",
    );
  });

  it("nothing new: nothing to mark read", async () => {
    const markRead = vi.fn();
    render(
      <PortalNotifications items={[]} markRead={markRead} unreadCount={0} />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Powiadomienia" }),
    );
    expect(screen.getByText(/Brak powiadomień/)).toBeInTheDocument();
    expect(markRead).not.toHaveBeenCalled();
  });
});
