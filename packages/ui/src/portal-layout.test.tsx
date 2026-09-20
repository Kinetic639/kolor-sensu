import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Home, Menu, Settings } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";
import { AppSidebar, MobileBottomNav } from "./portal-layout";

describe("portal navigation", () => {
  it("marks the active sidebar destination as the current page", () => {
    render(
      <AppSidebar
        sections={[
          {
            items: [
              {
                label: "Dashboard",
                href: "#dashboard",
                icon: Home,
                active: true,
              },
              { label: "Ustawienia", href: "#settings", icon: Settings },
            ],
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Nawigacja portalu" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Ustawienia" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("renders mobile navigation as a separate labelled landmark", () => {
    render(
      <MobileBottomNav
        items={[
          { label: "Dashboard", href: "#dashboard", icon: Home, active: true },
          { label: "Więcej", href: "#more", icon: Settings },
        ]}
      />,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Nawigacja mobilna",
    });
    expect(mobileNavigation).toBeInTheDocument();
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(2);
  });
});

describe("AppHeader", () => {
  it("exposes the user context and handles notification actions", async () => {
    const user = userEvent.setup();
    const handleNotifications = vi.fn();

    render(
      <AppHeader
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        notificationCount={2}
        onNotificationsClick={handleNotifications}
      />,
    );

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument();
    expect(screen.getByText("Psychoterapeutka")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Powiadomienia (2)" }));
    expect(handleNotifications).toHaveBeenCalledOnce();
  });

  it("opens accessible tablet navigation when configured", async () => {
    const user = userEvent.setup();

    render(
      <AppHeader
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        tabletNavigation={
          <nav aria-label="Menu tabletowe">
            <a href="#dashboard">
              <Menu aria-hidden="true" />
              Dashboard
            </a>
          </nav>
        }
      />,
    );

    await user.click(screen.getByRole("button", { name: "Otwórz nawigację" }));

    expect(
      screen.getByRole("dialog", { name: "Nawigacja portalu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Menu tabletowe" }),
    ).toBeInTheDocument();
  });
});
