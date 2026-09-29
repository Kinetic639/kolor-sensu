import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BookingChoiceCard,
  BookingStepper,
  BookingSummary,
  HoldNotice,
  SlotPicker,
  type SlotPickerDay,
} from "./index";

const steps = [
  { key: "usluga", label: "Usługa", href: "/umow-wizyte" },
  { key: "forma", label: "Forma", href: "/umow-wizyte?usluga=konsultacja" },
  { key: "specjalista", label: "Specjalista" },
  { key: "termin", label: "Termin" },
  { key: "dane", label: "Dane" },
  { key: "potwierdzenie", label: "Potwierdzenie" },
];

describe("BookingStepper", () => {
  it("marks steps done, current and ahead; done steps link back", () => {
    render(<BookingStepper current={2} steps={steps} />);
    const nav = screen.getByRole("navigation", { name: "Kroki rezerwacji" });
    const items = within(nav).getAllByRole("listitem");
    expect(items).toHaveLength(6);

    const done = within(nav).getByRole("link", { name: /Usługa/ });
    expect(done).toHaveAttribute("href", "/umow-wizyte");
    expect(done).toHaveAccessibleName("Krok 1: Usługa (ukończony)");

    const current = within(items[2]!).getByText("Specjalista");
    expect(current.closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "step",
    );
    // Steps ahead are not links.
    expect(within(items[3]!).queryByRole("link")).toBeNull();
  });
});

describe("BookingSummary", () => {
  it("lists the choices so far, with a change link, and placeholders for the rest", () => {
    render(
      <BookingSummary
        items={[
          {
            key: "usluga",
            icon: null,
            label: "Usługa",
            value: "Konsultacja psychologiczna",
            changeHref: "/umow-wizyte",
          },
          {
            key: "termin",
            icon: null,
            label: "Termin",
            placeholder: "Wybierz termin",
          },
        ]}
      >
        <a href="/dalej">Przejdź dalej</a>
      </BookingSummary>,
    );
    const summary = screen.getByRole("region", { name: "Twoja rezerwacja" });
    expect(
      within(summary).getByText("Konsultacja psychologiczna"),
    ).toBeVisible();
    expect(
      within(summary).getByRole("link", { name: "Zmień: Usługa" }),
    ).toHaveAttribute("href", "/umow-wizyte");
    expect(within(summary).getByText("Wybierz termin")).toBeVisible();
    expect(
      within(summary).getByRole("link", { name: "Przejdź dalej" }),
    ).toBeVisible();
  });
});

describe("BookingChoiceCard", () => {
  it("is one link named by its title; the chosen one says so", () => {
    render(
      <ul>
        <BookingChoiceCard
          description="Pierwsze spotkanie."
          facts={["50 minut", "od 250 zł"]}
          href="?usluga=konsultacja"
          selected
          tags={["Stacjonarnie", "Online"]}
          title="Konsultacja psychologiczna"
        />
        <BookingChoiceCard href="?usluga=terapia" title="Terapia par" />
      </ul>,
    );
    const chosen = screen.getByRole("link", {
      name: "Konsultacja psychologiczna",
    });
    expect(chosen).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Wybrana")).toBeVisible();
    expect(screen.getByText("50 minut")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Terapia par" }),
    ).not.toHaveAttribute("aria-current");
  });
});

const days: SlotPickerDay[] = [
  {
    date: "2030-01-07",
    weekday: "Pon.",
    label: "7 stycznia",
    fullLabel: "poniedziałek, 7 stycznia",
    slots: [
      { time: "09:00", href: "?termin=2030-01-07T09:00" },
      { time: "11:00", href: "?termin=2030-01-07T11:00", selected: true },
    ],
  },
  {
    date: "2030-01-08",
    weekday: "Wt.",
    label: "8 stycznia",
    fullLabel: "wtorek, 8 stycznia",
    slots: [],
  },
  {
    date: "2030-01-09",
    weekday: "Śr.",
    label: "9 stycznia",
    fullLabel: "środa, 9 stycznia",
    slots: [{ time: "10:00", href: "?termin=2030-01-09T10:00" }],
  },
];

describe("SlotPicker", () => {
  it("offers each free time as a link named by its day and hour", () => {
    render(
      <SlotPicker
        days={days}
        nextHref="?tydzien=2030-01-14"
        previousHref={null}
        weekLabel="7–13 stycznia 2030"
      />,
    );
    const grid = screen.getByTestId("slot-week");
    const monday = within(grid).getByRole("link", {
      name: "poniedziałek, 7 stycznia, 09:00",
    });
    expect(monday).toHaveAttribute("href", "?termin=2030-01-07T09:00");
    expect(
      within(grid).getByRole("link", {
        name: "poniedziałek, 7 stycznia, 11:00",
      }),
    ).toHaveAttribute("aria-current", "true");
    expect(within(grid).getAllByRole("link")).toHaveLength(3);
  });

  it("lines up the week in rows of the hours that have a free time", () => {
    render(<SlotPicker days={days} weekLabel="7–13 stycznia 2030" />);
    const grid = screen.getByTestId("slot-week");
    // 09:00, 10:00, 11:00: a row each, in every day's column.
    for (const date of ["2030-01-07", "2030-01-08", "2030-01-09"]) {
      expect(
        grid.querySelectorAll(`[data-day="${date}"] [data-slot-row]`),
      ).toHaveLength(3);
    }
  });

  it("lists the days on phones, saying when a day has no free time", () => {
    render(<SlotPicker days={days} weekLabel="7–13 stycznia 2030" />);
    const agenda = screen.getByTestId("slot-agenda");
    expect(within(agenda).getByText("Brak wolnych terminów")).toBeVisible();
    expect(within(agenda).getAllByRole("link")).toHaveLength(3);
  });

  it("moves between weeks, the past one unavailable", () => {
    render(
      <SlotPicker
        days={days}
        nextHref="?tydzien=2030-01-14"
        previousHref={null}
        weekLabel="7–13 stycznia 2030"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Następny tydzień" }),
    ).toHaveAttribute("href", "?tydzien=2030-01-14");
    expect(
      screen.queryByRole("link", { name: "Poprzedni tydzień" }),
    ).toBeNull();
    expect(
      screen.getByText("Poprzedni tydzień").closest("[aria-disabled]"),
    ).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("7–13 stycznia 2030")).toBeVisible();
  });

  it("says when the whole week is taken", () => {
    render(
      <SlotPicker
        days={days.map((day) => ({ ...day, slots: [] }))}
        weekLabel="7–13 stycznia 2030"
      />,
    );
    expect(
      screen.getByText("W tym tygodniu nie ma wolnych terminów."),
    ).toBeVisible();
  });
});

describe("HoldNotice", () => {
  it("says the time is held, and until when", () => {
    render(<HoldNotice until="10:42" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Twój termin jest tymczasowo zarezerwowany",
    );
    expect(screen.getByRole("status")).toHaveTextContent("do 10:42");
  });

  it("can say what to do before then", () => {
    render(<HoldNotice hint="Dokończ płatność." until="10:42" />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "do 10:42. Dokończ płatność.",
    );
  });
});
