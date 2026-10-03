import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AvailabilityPanel } from "./availability-panel";
import { ScheduleAgenda, WeekAgenda } from "./schedule-agenda";
import { ScheduleCanvas } from "./schedule-controls";
import {
  annaWeek,
  roomsDay,
  roomsWeek,
  specialistsDay,
  specialistsWeek,
} from "./schedule.samples";
import {
  ComparisonSummaryPanel,
  PersonalSummaryPanel,
} from "./schedule-summary";
import { ScheduleToolbar } from "./schedule-toolbar";
import { DaySchedule, WeekComparison } from "./schedule-views";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const visitHref = (id: string) => `/kalendarz?wizyta=${id}`;

function withUrl(
  node: ReactNode,
  query = "",
  onUrlUpdate?: OnUrlUpdateFunction,
) {
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={query}>
      {node}
    </NuqsTestingAdapter>,
  );
}

describe("DaySchedule", () => {
  it("a column per specialist: who, hours, visits and occupancy", () => {
    render(
      <DaySchedule
        ariaLabel="Kalendarz dnia"
        collapseHref={(key) => `/kalendarz?zwiniete=${key}`}
        mode="specialists"
        view={specialistsDay}
        visitHref={visitHref}
      />,
    );
    const anna = screen.getByRole("group", { name: /^Anna Nowak/ });
    expect(anna).toHaveAccessibleName(
      "Anna Nowak, 08:00 – 18:00, 5 wizyt, obłożenie 43%",
    );
    expect(
      within(anna).getByRole("note", {
        name: "Dostępność 08:00–16:00, Gabinet 1",
      }),
    ).toBeInTheDocument();
    expect(
      within(anna).getByRole("link", { name: /^Ewa Kowalska, / }),
    ).toHaveAttribute("href", "/kalendarz?wizyta=d2-1");
    // Waiting for payment says so.
    expect(
      within(anna).getByRole("link", {
        name: /Marta Nowicka.*czeka na płatność/,
      }),
    ).toBeInTheDocument();
    // Time off is blocked time.
    expect(
      screen.getByRole("note", { name: "Zablokowane 12:00 – 12:30: Przerwa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Karolina Adamczyk/ }),
    ).toHaveAttribute("data-unavailable", "true");
    expect(
      screen.getByRole("link", { name: "Zwiń kolumnę: Anna Nowak" }),
    ).toHaveAttribute("href", "/kalendarz?zwiniete=anna");
    // Now, on the axis and across today's columns.
    expect(screen.getAllByText("12:37")).toHaveLength(1);
  });

  it("a collapsed column is narrow, with compact blocks and a way back", () => {
    render(
      <DaySchedule
        ariaLabel="Kalendarz dnia"
        collapseHref={(key) => `/kalendarz?x=${key}`}
        collapsed={["anna"]}
        mode="specialists"
        view={specialistsDay}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByRole("link", { name: "Rozwiń kolumnę: Anna Nowak" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: /^Anna Nowak/ })).getByRole(
        "link",
        { name: /^Ewa Kowalska.*Gabinet 1$/ },
      ),
    ).toHaveTextContent("EK08:00");
  });

  it("rooms: closed ones say why, visits show who holds them", () => {
    render(
      <DaySchedule
        ariaLabel="Kalendarz dnia"
        mode="rooms"
        view={roomsDay}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByRole("group", { name: /^Gabinet 5, zamknięty: Remont/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Remont").length).toBeGreaterThan(0);
    const g2 = screen.getByRole("group", { name: /^Gabinet 2/ });
    expect(within(g2).getAllByRole("link")[0]).toHaveAccessibleName(
      /Tomasz Wójcik$/,
    );
  });

  it("marks the open visit and dims what the search leaves out", () => {
    render(
      <DaySchedule
        ariaLabel="Kalendarz dnia"
        mode="specialists"
        openVisitId="d2-2"
        view={specialistsDay}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByRole("link", { name: /^Piotr Wiśniewski/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("says when there is nobody", () => {
    render(
      <DaySchedule
        ariaLabel="Kalendarz dnia"
        empty="Brak aktywnych specjalistów."
        mode="specialists"
        view={{ ...specialistsDay, columns: [] }}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByText("Brak aktywnych specjalistów."),
    ).toBeInTheDocument();
  });

  it("a specialist's week: a column per day, today marked", () => {
    render(
      <DaySchedule
        ariaLabel="Mój tydzień"
        mode="personal"
        view={annaWeek}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByRole("group", { name: /^Śr, 2 października/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dziś")).toBeInTheDocument();
  });
});

describe("WeekComparison", () => {
  it("per day a lane per specialist, the day's share, today marked", () => {
    render(
      <WeekComparison
        ariaLabel="Tydzień"
        byRoom={false}
        view={specialistsWeek}
        visitHref={visitHref}
      />,
    );
    const wednesday = screen.getByRole("group", { name: /^Śr, 2/ });
    expect(
      within(wednesday).getByRole("group", { name: /^Anna Nowak/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Śr, 2").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "date",
    );
    // Michał works Tuesday to Thursday.
    expect(
      within(screen.getByRole("group", { name: /^Pon, 30/ })).getByRole(
        "group",
        { name: /^Michał Zieliński, brak dostępności/ },
      ),
    ).toBeInTheDocument();
  });

  it("rooms: a lane per room, visits with who holds them", () => {
    render(
      <WeekComparison
        ariaLabel="Tydzień"
        byRoom
        view={roomsWeek}
        visitHref={visitHref}
      />,
    );
    expect(
      within(screen.getByRole("group", { name: /^Pon, 30/ })).getByRole(
        "group",
        { name: /^Gabinet 2/ },
      ),
    ).toBeInTheDocument();
  });
});

describe("summary panels", () => {
  it("the week compared: totals, extremes, everyone", () => {
    withUrl(
      <ComparisonSummaryPanel
        byRoom={false}
        period="Tydzień 30 wrz – 6 paź"
        summary={specialistsWeek.summary}
      />,
      "?podsumowanie=true",
    );
    // A drawer over the calendar, opened from the toolbar.
    const panel = screen.getByRole("dialog", {
      name: "Porównanie specjalistów",
    });
    expect(within(panel).getByText("84")).toBeInTheDocument();
    expect(within(panel).getAllByText("Tomasz Wójcik")[0]).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Zamknij podsumowanie" }),
    ).toBeInTheDocument();
  });

  it("one's own week, with the next visits", () => {
    withUrl(
      <PersonalSummaryPanel
        availabilityHref="/dostepnosc"
        name="Anna Nowak"
        subtitle="Psychoterapeutka CBT"
        summary={annaWeek.summary}
        visitHref={visitHref}
      />,
      "?podsumowanie=true",
    );
    const panel = screen.getByRole("dialog", { name: "Anna Nowak" });
    expect(within(panel).getByText("Najbliższe wizyty")).toBeInTheDocument();
    expect(
      within(panel).getByRole("link", { name: /Dostępność i nieobecności/ }),
    ).toHaveAttribute("href", "/dostepnosc");
  });
});

describe("ScheduleToolbar", () => {
  const nav = {
    unit: "dzień" as const,
    label: "Śr, 2 paź 2030",
    previousHref: "/kalendarz?data=2030-10-01",
    nextHref: "/kalendarz?data=2030-10-03",
    todayHref: "/kalendarz",
    isCurrent: true,
  };

  it("navigates with links and switches the view in the address", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    withUrl(
      <ScheduleCanvas>
        <ScheduleToolbar
          nav={nav}
          switches={["puste", "wyszarz"]}
          views={[
            { key: "d", label: "Dzień", href: "/kalendarz", active: true },
            {
              key: "t",
              label: "Tydzień",
              href: "/kalendarz?widok=tydzien",
              active: false,
            },
          ]}
        />
        <div data-unavailable="true" data-testid="column" />
      </ScheduleCanvas>,
      "",
      onUrlUpdate,
    );
    expect(
      screen.getByRole("link", { name: "Następny dzień" }),
    ).toHaveAttribute("href", "/kalendarz?data=2030-10-03");
    // The calendar icon goes back to today.
    expect(screen.getByRole("link", { name: "Dziś" })).toHaveAttribute(
      "aria-current",
      "date",
    );
    expect(screen.getByRole("link", { name: "Dzień" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // The switches wait in the "Widok" menu.
    await userEvent.click(screen.getByRole("button", { name: "Widok" }));
    await userEvent.click(
      screen.getByRole("switch", { name: "Ukryj puste kolumny" }),
    );
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryString: "?puste=true" }),
    );
    // Greying out is on by default, and only in the browser.
    const greyed = screen.getByRole("switch", {
      name: "Wyszarz bez dostępności",
    });
    expect(greyed).toBeChecked();
    expect(screen.getByTestId("column").parentElement).toHaveAttribute(
      "data-grey",
      "true",
    );
    await userEvent.click(greyed);
    expect(screen.getByTestId("column").parentElement).not.toHaveAttribute(
      "data-grey",
    );
  });

  it("filters by location and finds a patient", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    withUrl(
      <ScheduleToolbar
        locations={[{ value: "online", label: "Online / Zdalnie" }]}
        nav={nav}
        switches={["puste"]}
        views={[]}
      />,
      "",
      onUrlUpdate,
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Lokalizacja" }),
      "online",
    );
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryString: "?lokalizacja=online" }),
    );
    expect(
      screen.getByRole("searchbox", { name: "Szukaj pacjenta" }),
    ).toBeInTheDocument();
  });

  it("the week's summary is a button of its own", async () => {
    const onUrlUpdate = vi.fn<OnUrlUpdateFunction>();
    withUrl(
      <ScheduleToolbar
        nav={{ ...nav, unit: "tydzień" }}
        switches={["puste", "podsumowanie"]}
        views={[]}
      />,
      "",
      onUrlUpdate,
    );
    // Closed until asked for.
    const summary = screen.getByRole("button", { name: "Podsumowanie" });
    expect(summary).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(summary);
    expect(onUrlUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ queryString: "?podsumowanie=true" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Widok" }));
    expect(
      screen.queryByRole("switch", { name: "Podsumowanie" }),
    ).not.toBeInTheDocument();
  });
});

describe("AvailabilityPanel", () => {
  it("whose window, where and when, what is booked in it", () => {
    const column = specialistsDay.columns[0]!;
    withUrl(
      <AvailabilityPanel
        closeHref="/kalendarz"
        column={column}
        dateLabel="środa, 2 października 2030"
        manage={{ href: "/specjalisci/anna", label: "Profil specjalisty" }}
        slot={column.availability[0]!}
        visitHref={visitHref}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "Gabinet 1" });
    expect(
      within(panel).getByText("Dostępność: Anna Nowak"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText("08:00–16:00 (8 godz.)"),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("link", { name: /Ewa Kowalska/ }),
    ).toHaveAttribute("href", "/kalendarz?wizyta=d2-1");
    expect(
      within(panel).getByRole("link", { name: "Profil specjalisty" }),
    ).toHaveAttribute("href", "/specjalisci/anna");
    expect(
      within(panel).getByRole("link", {
        name: "Zamknij szczegóły dostępności",
      }),
    ).toHaveAttribute("href", "/kalendarz");
  });
});

describe("the phone views", () => {
  it("a fold per specialist, open when they have visits", () => {
    render(
      <ScheduleAgenda
        ariaLabel="Kalendarz dnia"
        availabilityHref={(key) => `/kalendarz?okno=${key}`}
        columns={specialistsDay.columns}
        visitHref={visitHref}
      />,
    );
    const folds = screen.getAllByRole("group");
    expect(folds[0]).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: /^Ewa Kowalska/ })).toHaveAttribute(
      "href",
      "/kalendarz?wizyta=d2-1",
    );
    expect(
      screen.getByRole("link", {
        name: "Dostępność 08:00–16:00, Gabinet 1: szczegóły",
      }),
    ).toBeInTheDocument();
    // Karolina has nothing: closed, and says so.
    expect(folds.at(-1)).not.toHaveAttribute("open");
    expect(screen.getAllByText("Brak zaplanowanych wizyt")).toHaveLength(1);
  });

  it("the week: a button per day, the chosen day's list", () => {
    render(
      <WeekAgenda
        ariaLabel="Tydzień"
        byRoom={false}
        dayHref={(date) => `/kalendarz?widok=tydzien&data=${date}`}
        selected="2030-10-03"
        view={specialistsWeek}
        visitHref={visitHref}
      />,
    );
    expect(screen.getByRole("link", { name: /Czw\s*3/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
    expect(screen.getByRole("link", { name: /Pon\s*30/ })).toHaveAttribute(
      "href",
      "/kalendarz?widok=tydzien&data=2030-09-30",
    );
    expect(screen.getByText("Czw, 3")).toBeInTheDocument();
  });
});
