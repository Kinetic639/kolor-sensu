import type { ClientRow } from "@repo/scheduling";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { toast } from "../toast";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminRows } from "../visit-table/visit-table.samples";
import { ClientCard } from "./client-card";
import { ClientFilterBar } from "./client-filter-bar";
import { ClientPanel } from "./client-panel";
import { ClientTable } from "./client-table";
import { parseClientLayout } from "./columns";
import { EditClientButton } from "./edit-client";
import {
  clientPanelCloseHref,
  clientPanelTabs,
  loadClientTableParams,
} from "./params";

const router = { refresh: vi.fn(), push: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const row: ClientRow = {
  id: "client-1",
  name: "Jan Kowalski",
  listName: "Kowalski Jan",
  email: "jan@example.invalid",
  phone: "600 100 200",
  visits: "3",
  upcoming: "1 nadchodząca",
  lastVisit: "20.09.2026",
  nextVisit: "pon. 05.10.2026, 10:00",
  paid: "600 zł",
  since: "Klient od 01.09.2026",
  href: "/klienci/client-1",
  notes: "Woli popołudnia",
};

beforeEach(() => {
  router.refresh.mockReset();
  router.push.mockReset();
  vi.mocked(toast.success).mockReset();
});

describe("ClientTable", () => {
  it("each client a row, the name pinned; the headers sort", () => {
    render(
      <ClientTable
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
    );
    const table = screen.getByRole("table", { name: "Klienci" });
    // The name opens the client in the side panel.
    expect(
      within(table).getByRole("link", { name: "Kowalski Jan" }),
    ).toHaveAttribute("href", "/klienci?klient=client-1");
    expect(table).toHaveTextContent("600 zł");
    // Sorted by the latest visit, latest first, by default.
    expect(
      within(table).getByRole("columnheader", { name: /Ostatnia wizyta/ }),
    ).toHaveAttribute("aria-sort", "descending");
    expect(
      within(table).getByRole("link", { name: /^Nazwisko i imię/ }),
    ).toHaveAttribute("href", "/klienci?sort=nazwisko");
    expect(screen.getByText("1–1 z 1")).toBeInTheDocument();
  });

  it("the row's menu: their card, a call, an e-mail", async () => {
    render(
      <ClientTable
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Akcje: Jan Kowalski" }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Karta klienta" }),
    ).toHaveAttribute("href", "/klienci/client-1");
    expect(screen.getByRole("menuitem", { name: "Zadzwoń" })).toHaveAttribute(
      "href",
      "tel:600100200",
    );
    expect(
      screen.getByRole("menuitem", { name: "Napisz e-mail" }),
    ).toHaveAttribute("href", "mailto:jan@example.invalid");
  });

  it("a click on a row opens the client; again, closes them", () => {
    const { rerender } = render(
      <ClientTable
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
    );
    fireEvent.click(screen.getByText("jan@example.invalid"));
    expect(router.push).toHaveBeenCalledWith("/klienci?klient=client-1", {
      scroll: false,
    });
    rerender(
      <ClientTable
        params={{ ...loadClientTableParams({}), klient: "client-1" }}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
    );
    const name = screen.getByRole("link", { name: "Kowalski Jan" });
    expect(name).toHaveAttribute("aria-current", "true");
    expect(name).toHaveAttribute("href", "/klienci");
  });

  it("shows the person's own columns, with the menu to change them", () => {
    render(
      <ClientTable
        columns={parseClientLayout("notatka,wizyty")}
        columnsCookie="ks_cols_klienci"
        params={loadClientTableParams({})}
        path="/klienci"
        rows={[row]}
        total={1}
      />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers.slice(1, 3)).toEqual(["Notatka", "Wizyty"]);
    expect(screen.getByText("Woli popołudnia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kolumny/ })).toBeInTheDocument();
  });

  it("says why it is empty", () => {
    render(
      <ClientTable
        params={loadClientTableParams({ q: "xyz" })}
        path="/klienci"
        rows={[]}
        total={0}
      />,
    );
    expect(
      screen.getByText(/Żaden klient nie pasuje do wyszukiwania i filtrów/),
    ).toBeInTheDocument();
  });
});

describe("ClientFilterBar", () => {
  it("a chip per filter, the search folded to a magnifier", () => {
    render(<ClientFilterBar />, {
      wrapper: withNuqsTestingAdapter({
        searchParams: "?nadchodzaca=brak&dodany=ten-miesiac",
      }),
    });
    expect(
      screen.getByRole("button", { name: /Nadchodząca wizyta jest\s*Brak/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Klient od:\s*Ten miesiąc/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filtry, ustawione: 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Szukaj klienta" }),
    ).toBeInTheDocument();
  });
});

describe("ClientPanel", () => {
  const params = { ...loadClientTableParams({}), klient: "client-1" };

  it("details: how to reach them, their visits in numbers, the note", () => {
    render(
      <ClientPanel
        cancelled={1}
        closeHref={clientPanelCloseHref("/klienci", params)}
        notes="Woli popołudnia"
        row={row}
        tab="szczegoly"
        tabs={clientPanelTabs("/klienci", params)}
        visits={[]}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "Jan Kowalski" });
    expect(panel).toHaveTextContent("Woli popołudnia");
    expect(
      within(panel).getByRole("link", { name: "Zamknij kartę klienta" }),
    ).toHaveAttribute("href", "/klienci");
    expect(
      within(panel).getByRole("link", { name: /Karta klienta/ }),
    ).toHaveAttribute("href", "/klienci/client-1");
    expect(
      within(panel).getByRole("navigation", { name: "Sekcje klienta" }),
    ).toBeInTheDocument();
  });

  it("their visits, each leading to its booking", () => {
    const visit = adminRows[0]!;
    render(
      <ClientPanel
        cancelled={0}
        closeHref="/klienci"
        notes={null}
        row={row}
        tab="wizyty"
        tabs={clientPanelTabs("/klienci", params)}
        visits={[visit]}
      />,
    );
    expect(
      screen.getByRole("link", { name: new RegExp(visit.serviceName) }),
    ).toHaveAttribute(
      "href",
      `/rezerwacje?zakres=wszystkie&q=${visit.reference}&wizyta=${visit.id}`,
    );
  });
});

describe("ClientCard", () => {
  it("how to reach them, their numbers and the centre's note", () => {
    render(<ClientCard cancelled={1} notes="Woli popołudnia" row={row} />);
    expect(
      screen.getByRole("heading", { name: "Jan Kowalski" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "jan@example.invalid" }),
    ).toHaveAttribute("href", "mailto:jan@example.invalid");
    expect(screen.getByRole("link", { name: "600 100 200" })).toHaveAttribute(
      "href",
      "tel:600100200",
    );
    expect(screen.getByText("Woli popołudnia")).toBeInTheDocument();
  });

  it("no note yet", () => {
    render(
      <ClientCard cancelled={0} notes={null} row={{ ...row, phone: null }} />,
    );
    expect(screen.getByText(/Brak notatki/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /600/ })).not.toBeInTheDocument();
  });
});

describe("EditClientButton", () => {
  const details = {
    firstName: "Jan",
    lastName: "Kowalski",
    email: "jan@example.invalid",
    phone: "600 100 200",
    notes: null,
  };

  it("checks the fields before asking", async () => {
    const action = vi.fn();
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    const email = screen.getByLabelText("E-mail");
    await userEvent.clear(email);
    await userEvent.type(email, "nie e-mail");
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(
      await screen.findByText("Podaj poprawny adres e-mail."),
    ).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(action).not.toHaveBeenCalled();
  });

  it("saves, says the visits to come followed, and refreshes", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true, upcomingUpdated: 2 });
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    await userEvent.type(
      screen.getByLabelText(/Notatka centrum/),
      "Woli popołudnia",
    );
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    await vi.waitFor(() =>
      expect(action).toHaveBeenCalledWith("client-1", {
        firstName: "Jan",
        lastName: "Kowalski",
        email: "jan@example.invalid",
        phone: "600 100 200",
        notes: "Woli popołudnia",
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Zapisano dane klienta. Zmieniono też 2 nadchodzące wizyty.",
    );
    expect(router.refresh).toHaveBeenCalled();
  });

  it("says why the database refused", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      message: "Inny klient ma już ten adres e-mail.",
    });
    render(
      <EditClientButton
        action={action}
        clientId="client-1"
        details={details}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Edytuj dane" }));
    await userEvent.click(screen.getByRole("button", { name: "Zapisz" }));
    expect(
      await screen.findByText("Inny klient ma już ten adres e-mail."),
    ).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
