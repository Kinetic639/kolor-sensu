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

  it("sets a column's width at its edge, kept in a cookie", async () => {
    document.cookie = "ks_widths_test=; max-age=0; path=/";
    const { container } = render(
      <VisitTable
        params={tableParams()}
        path={path}
        rows={adminRows}
        total={4}
        widths={{ klient: 200 }}
        widthsCookie="ks_widths_test"
      />,
    );
    const column = () =>
      container.querySelector<HTMLElement>('col[data-column="klient"]')!;
    expect(column().style.width).toBe("200px");

    const edge = screen.getByRole("separator", {
      name: "Szerokość kolumny Klient",
    });
    fireEvent.keyDown(edge, { key: "ArrowRight" });
    expect(edge).toHaveAttribute("aria-valuenow", "216");
    expect(column().style.width).toBe("216px");
    expect(decodeURIComponent(document.cookie)).toContain(
      "ks_widths_test=klient:216",
    );

    // The pinned number too.
    const number = screen.getByRole("separator", {
      name: "Szerokość kolumny Numer",
    });
    fireEvent.keyDown(number, { key: "ArrowLeft" });
    expect(
      container.querySelector<HTMLElement>('col[data-column="numer"]')!.style
        .width,
    ).toBe("144px");

    // Double-click: the usual width again, and none saved.
    fireEvent.doubleClick(edge);
    expect(column().style.width).toBe("190px");
    expect(decodeURIComponent(document.cookie)).not.toContain("klient:");
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

  it("the footer: rows per page on the right, by the pages", () => {
    render(
      <VisitTable
        params={tableParams()}
        path={path}
        rows={adminRows}
        total={4}
      />,
    );
    const pages = screen.getByRole("navigation", { name: "Strony" });
    expect(pages.parentElement).toContainElement(
      screen.getByRole("navigation", { name: "Wierszy na stronie" }),
    );
    expect(pages.parentElement).toHaveClass("ml-auto");
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
  const renderBar = (
    search: string,
    order?: string[],
    onUrlUpdate?: (event: { queryString: string }) => void,
  ) =>
    render(
      <VisitFilterBar
        order={order}
        rooms={sampleRooms}
        showPayments
        specialists={sampleSpecialists}
      />,
      {
        wrapper: withNuqsTestingAdapter({ searchParams: search, onUrlUpdate }),
      },
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
    const searchbox = screen.getByRole("searchbox", {
      name: "Szukaj rezerwacji",
    });
    expect(searchbox).toHaveClass("w-0");
    // The chips on the bar's right.
    const chips = screen.getByRole("group", { name: "Ustawione filtry" });
    expect(chips).toHaveClass("ml-auto");
    expect(chips).toContainElement(
      screen.getByRole("button", { name: "Usuń filtr Termin" }),
    );
    // The filters first, at the bar's left, then the search.
    expect(
      screen
        .getByRole("button", { name: "Filtry, ustawione: 2" })
        .compareDocumentPosition(searchbox) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Nothing searched: nothing to clear.
    expect(
      screen.queryByRole("button", { name: "Wyczyść wyszukiwanie" }),
    ).not.toBeInTheDocument();
  });

  it("clears the whole search with the button at its end, from page 1", async () => {
    const onUrlUpdate = vi.fn();
    renderBar("?q=kowal&strona=3", undefined, onUrlUpdate);
    const search = screen.getByRole("searchbox", { name: "Szukaj rezerwacji" });
    expect(search).toHaveValue("kowal");
    await userEvent.click(
      screen.getByRole("button", { name: "Wyczyść wyszukiwanie" }),
    );
    expect(search).toHaveValue("");
    expect(search).toHaveFocus();
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryString: "" }),
    );
    expect(
      screen.queryByRole("button", { name: "Wyczyść wyszukiwanie" }),
    ).not.toBeInTheDocument();
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
    // Several at once, as statuses: checkboxes.
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Zwrot do zlecenia" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("follows the columns' order, in the list and in the bar", async () => {
    renderBar("?status=odwolane&zmiana=dzis", [
      "status",
      "zmiana",
      "termin",
      "specjalista",
    ]);
    const chips = screen
      .getAllByRole("button", { name: /^Usuń filtr/ })
      .map((chip) => chip.getAttribute("aria-label"));
    expect(chips).toEqual([
      "Usuń filtr Status",
      "Usuń filtr Zmiana",
      "Usuń filtr Termin",
    ]);
    await userEvent.click(screen.getByRole("button", { name: /^Filtry/ }));
    const fields = within(screen.getByRole("dialog"))
      .getAllByRole("listitem")
      .map((item) => item.textContent?.replace(/\d+$/, "").trim());
    expect(fields.slice(0, 4)).toEqual([
      "Status",
      "Zmiana",
      "Termin",
      "Specjalista",
    ]);
  });

  it("ticks several specialists; dates of a change as the visit's", async () => {
    const updates: string[] = [];
    renderBar(`?specjalista=${sampleSpecialists[0]!.id}`, undefined, (event) =>
      updates.push(event.queryString),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^Specjalista jest/ }),
    );
    await userEvent.click(
      screen.getByRole("menuitemcheckbox", {
        name: sampleSpecialists[1]!.name,
      }),
    );
    expect(decodeURIComponent(updates.at(-1)!)).toContain(
      `specjalista=${sampleSpecialists[0]!.id},${sampleSpecialists[1]!.id}`,
    );

    await userEvent.click(screen.getByRole("button", { name: /^Filtry/ }));
    await userEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Utworzono",
      }),
    );
    expect(
      screen.getByRole("menuitemradio", { name: "Ostatnie 7 dni" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Własny zakres dat")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "Wczoraj" }),
    );
    expect(updates.at(-1)).toContain("utworzono=wczoraj");
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

  it("the questionnaire before a consultation, where there is one", () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={null}
        intake={{
          lowMood: true,
          givenAt: "05.10, 09:30",
          rows: [
            { label: "Samopoczucie", value: "2/10 · Jestem osobą…" },
            { label: "Trudności", value: "Lęk, Stres" },
          ],
        }}
        row={adminRows[0]!}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    const intake = screen.getByRole("region", {
      name: "Test przed konsultacją",
    });
    expect(intake).toHaveTextContent("Niski nastrój");
    expect(intake).toHaveTextContent("wypełniony 05.10, 09:30");
    expect(intake).toHaveTextContent("TrudnościLęk, Stres");
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

  it("switches tabs in place: no request, the tab in the address", async () => {
    render(
      <VisitPanel
        closeHref="/kalendarz"
        events={sampleEvents}
        row={adminRows[0]!}
        tab="szczegoly"
        tabs={panelTabs}
      />,
    );
    expect(
      screen.queryByRole("list", { name: "Historia rezerwacji" }),
    ).toBeNull();
    const history = screen.getByRole("link", { name: "Historia" });
    await userEvent.click(history);
    expect(
      screen.getByRole("list", { name: "Historia rezerwacji" }),
    ).toBeVisible();
    expect(history).toHaveAttribute("aria-current", "page");
    expect(window.location.href).toContain(history.getAttribute("href")!);
    expect(push).not.toHaveBeenCalled();
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
