import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";
import {
  AppSidebar,
  MobileBottomNav,
  isPortalPathActive,
  portalBreadcrumbs,
  PortalBreadcrumbTrail,
} from "./portal-layout";
import { SidebarProvider, SidebarTrigger } from "./sidebar";

const navigation = [
  {
    label: "PRACA",
    items: [
      { label: "Dashboard", href: "/", icon: "dashboard" as const },
      {
        label: "Specjaliści",
        href: "/specjalisci",
        icon: "specialists" as const,
      },
    ],
  },
];

describe("portal navigation", () => {
  it("derives active state for exact and nested routes", () => {
    expect(isPortalPathActive("/", "/")).toBe(true);
    expect(isPortalPathActive("/specjalisci/123", "/specjalisci")).toBe(true);
    expect(isPortalPathActive("/ustawienia", "/specjalisci")).toBe(false);
  });

  it("marks the current sidebar destination", () => {
    render(
      <SidebarProvider>
        <AppSidebar currentPath="/specjalisci/123" sections={navigation} />
      </SidebarProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Nawigacja portalu" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Specjaliści" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("toggles between expanded sidebar and collapsed icon rail", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SidebarProvider defaultOpen>
        <AppSidebar currentPath="/" sections={navigation} />
        <SidebarTrigger />
      </SidebarProvider>,
    );

    expect(
      container.querySelector('[data-state="expanded"]'),
    ).toBeInTheDocument();
    const trigger = screen
      .getAllByRole("button", { name: "Przełącz nawigację" })
      .find((button) => button.tabIndex !== -1);
    expect(trigger).toBeDefined();
    await user.click(trigger!);
    expect(
      container.querySelector('[data-state="collapsed"]'),
    ).toBeInTheDocument();
  });

  it("renders mobile navigation as a separate labelled landmark", () => {
    render(
      <MobileBottomNav
        currentPath="/"
        items={[
          { label: "Dashboard", href: "/", icon: "dashboard" },
          { label: "Więcej", href: "/ustawienia", icon: "settings" },
        ]}
      />,
    );

    const mobileNavigation = screen.getByRole("navigation", {
      name: "Nawigacja mobilna",
    });
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(2);
    expect(
      within(mobileNavigation).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe("AppHeader", () => {
  it("exposes user context and handles notification actions", async () => {
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
    await user.click(screen.getByRole("button", { name: "Powiadomienia (2)" }));
    expect(handleNotifications).toHaveBeenCalledOnce();
  });

  it("shows a role-based portal switch for a dual-role user", async () => {
    const user = userEvent.setup();
    render(
      <AppHeader
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        portalSwitch={{
          label: "Przejdź do panelu administratora",
          href: "http://localhost:3001",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu użytkownika" }));
    expect(
      screen.getByRole("menuitem", {
        name: "Przejdź do panelu administratora",
      }),
    ).toHaveAttribute("href", "http://localhost:3001");
  });

  it("does not show an admin switch for a specialist-only user", async () => {
    const user = userEvent.setup();
    render(
      <AppHeader
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        profileHref="/profil"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu użytkownika" }));
    expect(
      screen.queryByRole("menuitem", {
        name: "Przejdź do panelu administratora",
      }),
    ).not.toBeInTheDocument();
  });

  it("submits the shared logout action from the user menu", async () => {
    const user = userEvent.setup();
    const logoutAction = vi.fn();
    render(
      <AppHeader
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
        logoutAction={logoutAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Menu użytkownika" }));
    await user.click(screen.getByRole("menuitem", { name: "Wyloguj się" }));
    expect(logoutAction).toHaveBeenCalledOnce();
  });
});

describe("portal breadcrumbs", () => {
  it("starts at the dashboard, without the portal's name", () => {
    expect(portalBreadcrumbs(navigation, "/")).toEqual([
      { label: "Dashboard" },
    ]);
    expect(portalBreadcrumbs(navigation, "/specjalisci")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Specjaliści" },
    ]);
  });

  it("names what a detail page shows, under its section", () => {
    expect(
      portalBreadcrumbs(navigation, "/specjalisci/abc", "Anna Nowak"),
    ).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Specjaliści", href: "/specjalisci" },
      { label: "Anna Nowak" },
    ]);
    // Without a name, the section is where one is.
    expect(portalBreadcrumbs(navigation, "/specjalisci/abc")).toEqual([
      { label: "Dashboard", href: "/" },
      { label: "Specjaliści" },
    ]);
  });

  it("shows only the dashboard on an unknown path", () => {
    expect(portalBreadcrumbs(navigation, "/nie-ma")).toEqual([
      { label: "Dashboard", href: "/" },
    ]);
  });

  it("renders a trail with links and the current page", () => {
    render(
      <PortalBreadcrumbTrail
        items={portalBreadcrumbs(navigation, "/specjalisci/abc", "Anna Nowak")}
      />,
    );
    const trail = screen.getByRole("navigation", { name: "Okruszki" });
    expect(
      within(trail).getByRole("link", { name: "Specjaliści" }),
    ).toHaveAttribute("href", "/specjalisci");
    expect(within(trail).getByText("Anna Nowak")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(trail.querySelectorAll("li li")).toHaveLength(0);
  });

  it("renders the trail in the header instead of a search box", () => {
    render(
      <AppHeader
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Dostępność" },
        ]}
        user={{ name: "Anna Kowalska", role: "Psychoterapeutka" }}
      />,
    );

    const trail = screen.getByRole("navigation", { name: "Okruszki" });
    expect(
      within(trail).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("href", "/");
    expect(within(trail).getByText("Dostępność")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    // Separators are list items of their own, never nested in another.
    expect(trail.querySelectorAll("li li")).toHaveLength(0);
  });
});
