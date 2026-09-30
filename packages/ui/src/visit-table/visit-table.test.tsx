import { fireEvent, render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VisitPanel } from "./visit-panel";
import { VisitTable, VisitTableToolbar } from "./visit-table";
import {
  adminRows,
  panelTabs,
  sampleEvents,
  sampleSpecialists,
  specialistRows,
  tableParams,
} from "./visit-table.samples";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => push.mockClear());

const path = "/kalendarz";

describe("VisitTable", () => {
  it("shows a page of visits with sortable columns", () => {
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
    expect(rows[1]).toHaveTextContent("Opłacona");
    expect(rows[1]).toHaveTextContent(/200\s*zł/);
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
    expect(screen.getByRole("link", { name: /Data/ })).toHaveAttribute(
      "href",
      "/kalendarz",
    );
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
    expect(screen.getByText("11–14 z 42 · strona 2 z 5")).toBeInTheDocument();
    const [next] = screen.getAllByRole("link", { name: "Następna strona" });
    expect(next).toHaveAttribute("href", "/kalendarz?strona=3&wierszy=10");
    expect(
      screen.getByRole("link", { name: "Pierwsza strona" }),
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
    for (const next of screen.getAllByRole("link", {
      name: "Następna strona",
    })) {
      expect(next).toHaveAttribute("aria-disabled", "true");
    }
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
      screen.getByText("Brak rezerwacji pasujących do wyszukiwania i filtrów."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 z 0 · strona 1 z 1")).toBeInTheDocument();
  });
});

describe("VisitTableToolbar", () => {
  it("searches and offers a way back to everything when filtered", () => {
    render(
      <VisitTableToolbar
        params={tableParams("q=jan&status=odwolane")}
        path={path}
        showPayments
        specialists={sampleSpecialists}
      />,
      { wrapper: withNuqsTestingAdapter({ searchParams: "?q=jan" }) },
    );
    expect(
      screen.getByRole("searchbox", { name: "Szukaj rezerwacji" }),
    ).toHaveValue("jan");
    expect(
      screen.getByRole("button", { name: /Status:\s*Odwołane/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Specjalista:\s*Wszyscy/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Wyczyść filtry" }),
    ).toHaveAttribute("href", "/kalendarz");
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
