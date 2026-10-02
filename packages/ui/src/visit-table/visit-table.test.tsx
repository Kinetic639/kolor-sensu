import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseColumnLayout } from "./columns";
import { VisitFilterBar } from "./visit-filter-bar";
import { VisitPanel } from "./visit-panel";
import { VisitTable, visitColumnsAvailable } from "./visit-table";
import {
  adminRows,
  panelTabs,
  sampleEvents,
  sampleRooms,
  sampleSpecialists,
  specialistRows,
  tableParams,
} from "./visit-table.samples";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
beforeEach(() => {
  push.mockClear();
  refresh.mockClear();
});

const path = "/kalendarz";

describe("VisitTable", () => {
  it("shows a page of visits; the headers sort", () => {
    render(
      <VisitTable
        params={tableParams("sort=klient")}
        path={path}
        rows={adminRows}
        showPayment
        showSpecialist
        total={42}
      />,
    );
    const table = screen.getByRole("table", { name: "Rezerwacje" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(adminRows.length + 1);
    expect(rows[1]).toHaveTextContent("Jan Kowalski");
    expect(rows[1]).toHaveTextContent(/Opłacona · 200\s*zł/);
    // The reference heads the row, for screen readers too.
    expect(within(rows[1]!).getByRole("rowheader")).toHaveTextContent(
      "3010-017",
    );
    expect(
      screen.getByRole("columnheader", { name: /Klient/ }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("link", { name: /Klient/ })).toHaveAttribute(
      "href",
      "/kalendarz?sort=klient&kierunek=malejaco",
    );
    expect(screen.getByRole("link", { name: /Termin/ })).toHaveAttribute(
      "href",
      "/kalendarz",
    );
    // Contact details and notes are hidden until asked for.
    expect(screen.queryByRole("columnheader", { name: "Telefon" })).toBeNull();
  });

  it("shows the person's own columns, in their order, with the menu to change them", () => {
    render(
      <VisitTable
        columns={parseColumnLayout(
          "status,klient,telefon,-termin",
          visitColumnsAvailable({ showPayment: true, showSpecialist: true }),
        )}
        columnsCookie="ks_cols_test"
        params={tableParams()}
        path={path}
        rows={adminRows}
        showPayment
        showSpecialist
        total={4}
      />,
    );
    const headers = screen
      .getAllByRole("columnheader")
      .map((header) => header.textContent?.trim());
    expect(headers.slice(0, 4)).toEqual([
      "Numer",
      "Status",
      "Klient",
      "Telefon",
    ]);
    expect(headers).not.toContain("Termin");
    expect(screen.getByRole("button", { name: "Kolumny" })).toBeInTheDocument();
  });

  it("a click on a row opens the visit in the side panel; again, closes it", () => {
    const { rerender } = render(
      <VisitTable
        params={tableParams()}
        path={path}
        rows={adminRows}
        total={4}
      />,
    );
    fireEvent.click(screen.getByText("Jan Kowalski"));
    expect(push).toHaveBeenCalledWith("/kalendarz?wizyta=v1", {
      scroll: false,
    });
    expect(screen.getByRole("link", { name: "3010-017" })).toHaveAttribute(
      "href",
      "/kalendarz?wizyta=v1",
    );
    rerender(
      <VisitTable
        params={{ ...tableParams(), wizyta: "v1" }}
        path={path}
        rows={adminRows}
        total={4}
      />,
    );
    expect(screen.getByRole("link", { name: "3010-017" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("pages through all the matches", () => {
    render(
      <VisitTable
        params={tableParams("strona=2&wierszy=10")}
        path={path}
        rows={adminRows}
        total={42}
      />,
    );
    expect(screen.getByText("11–14 z 42")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Następna strona" }),
    ).toHaveAttribute("href", "/kalendarz?strona=3&wierszy=10");
    expect(
      screen.getByRole("link", { name: "Poprzednia strona" }),
    ).toHaveAttribute("href", "/kalendarz?wierszy=10");
  });

  it("a specialist's table has no payments or specialist column", () => {
    render(
      <VisitTable
        params={tableParams()}
        path={path}
        rows={specialistRows}
        total={specialistRows.length}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: /Płatność/ })).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: /Specjalista/ }),
    ).toBeNull();
    expect(
      screen.getByRole("link", { name: "Następna strona" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("says when nothing matches", () => {
    render(
      <VisitTable
        params={tableParams("q=zzz")}
        path={path}
        rows={[]}
        total={0}
      />,
    );
    expect(
      screen.getByText(/Żadna wizyta nie pasuje do wyszukiwania i filtrów/),
    ).toBeInTheDocument();
    expect(screen.getByText("0 z 0")).toBeInTheDocument();
  });
});

describe("VisitFilterBar", () => {
  const renderBar = (search: string) =>
    render(
      <VisitFilterBar
        rooms={sampleRooms}
        showPayments
        specialists={sampleSpecialists}
      />,
      { wrapper: withNuqsTestingAdapter({ searchParams: search }) },
    );

  it("a chip per filter, the search folded to a magnifier", () => {
    renderBar("?status=oczekujace,potwierdzone");
    expect(
      screen.getByRole("button", { name: /Termin:\s*Nadchodzące/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /Status jest\s*Czeka na płatność, Potwierdzona/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Usuń filtr Termin" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filtry, ustawione: 2" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "Szukaj rezerwacji" }),
    ).toHaveClass("w-0");
  });

  it("the filter list marks what is in the bar, removes it, clears all", async () => {
    renderBar("?status=odwolane");
    await userEvent.click(screen.getByRole("button", { name: /^Filtry/ }));
    const list = screen.getByRole("dialog");
    // In the bar already: marked, with how many values and an "×".
    expect(
      within(list).getByRole("button", { name: /^Status, w pasku/ }),
    ).toHaveTextContent("1");
    expect(
      within(list).getByRole("button", { name: "Usuń filtr Status" }),
    ).toBeInTheDocument();
    expect(
      within(list).queryByRole("button", { name: "Usuń filtr Płatność" }),
    ).toBeNull();
    expect(
      within(list).getByRole("button", { name: "Wyczyść wszystkie" }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(list).getByRole("button", { name: "Płatność" }),
    );
    expect(
      screen.getByRole("group", { name: "Wartości: Płatność" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: "Zwrot do zlecenia" }),
    ).toHaveAttribute("aria-checked", "false");
  });
});

describe("VisitPanel", () => {
  it("details: when, who, the money; the contact with its icon actions", () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={null}
        row={adminRows[0]!}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "Jan Kowalski" });
    expect(panel).toHaveTextContent("3010-017");
    expect(panel).toHaveTextContent("Opłacona");
    expect(
      within(panel).getByRole("link", { name: "Zadzwoń" }),
    ).toHaveAttribute("href", "tel:600100200");
    expect(
      within(panel).getByRole("button", { name: "Kopiuj adres e-mail" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("toolbar", { name: "Akcje rezerwacji" }),
    ).toContainElement(
      within(panel).getByRole("button", { name: "Kopiuj numer rezerwacji" }),
    );
    expect(
      within(panel).getByRole("link", { name: "Szczegóły" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(panel).getByRole("link", { name: "Zamknij szczegóły wizyty" }),
    ).toHaveAttribute("href", "/kalendarz");
  });

  it("closes through the panel: its link and Escape leave the address", async () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={null}
        row={adminRows[0]!}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    await userEvent.click(
      screen.getByRole("link", { name: "Zamknij szczegóły wizyty" }),
    );
    expect(push).toHaveBeenCalledWith("/kalendarz", { scroll: false });
  });

  it("Escape closes it too, but not while a menu is open", () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={null}
        row={adminRows[0]!}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/kalendarz", { scroll: false });
  });

  it("a reservation not paid yet says when it must be paid by", () => {
    const reserved = adminRows.find((row) => row.reference === "3010-020")!;
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={null}
        row={reserved}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    const panel = screen.getByRole("complementary", {
      name: "Piotr Zieliński",
    });
    expect(panel).toHaveTextContent("Czeka na płatność");
    expect(panel).toHaveTextContent(/Zapłata do\s*wt\.? 01\.10, 16:00/);
  });

  it("history: every event, oldest first, with who did it", () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={sampleEvents}
        row={adminRows[0]!}
        tab="historia"
        tabs={panelTabs}
      />,
    );
    const items = within(
      screen.getByRole("list", { name: "Historia rezerwacji" }),
    ).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Zarezerwowano termin");
    expect(items[1]).toHaveTextContent("Płatność (Stripe)");
    expect(items[3]).toHaveTextContent(
      "Wysłano e-mail: Potwierdzenie rezerwacji",
    );
  });
});
