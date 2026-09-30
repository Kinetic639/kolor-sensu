import { render, screen, within } from "@testing-library/react";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { VisitTable, VisitTableToolbar } from "./visit-table";
import {
  adminRows,
  sampleSpecialists,
  specialistRows,
  tableParams,
} from "./visit-table.samples";

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
    expect(screen.getByText("Strona 2 z 5")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Następna strona" }),
    ).toHaveAttribute("href", "/kalendarz?strona=3&wierszy=10");
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
    expect(
      screen.getByRole("button", { name: "Następna strona" }),
    ).toBeDisabled();
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
    expect(screen.getByText("Brak wyników")).toBeInTheDocument();
  });
});

describe("VisitTableToolbar", () => {
  it("searches and offers a way back to everything when filtered", () => {
    render(
      <VisitTableToolbar
        params={tableParams("q=jan&status=odwolane")}
        path={path}
        showRefunds
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
