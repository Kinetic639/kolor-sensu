import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { annaWeek, roomsDay, specialistsDay } from "./calendar-view.samples";
import { ResourceCalendar } from "./resource-calendar";

const visitHref = (id: string) => `/kalendarz?wizyta=${id}`;

describe("ResourceCalendar", () => {
  it("a column per specialist, summed up in its header", () => {
    render(
      <ResourceCalendar
        ariaLabel="Kalendarz dnia"
        view={specialistsDay}
        visitHref={visitHref}
      />,
    );
    const anna = screen.getByRole("group", { name: /^Anna Kłobuchowska/ });
    expect(anna).toHaveAccessibleName(
      "Anna Kłobuchowska, 09:00–15:00, 3 wizyty · 2,8 godz. z 6 godz.",
    );
    expect(screen.getByText("Brak dostępności")).toBeInTheDocument();
    expect(screen.getAllByText("47%")[0]).toBeInTheDocument();
    // Availability is a note; visits are links to their details.
    expect(
      within(anna).getByRole("note", {
        name: "Dostępność 09:00–15:00, Gabinet Zielony",
      }),
    ).toBeInTheDocument();
    expect(
      within(anna).getByRole("link", { name: /^Jan Kowalski, / }),
    ).toHaveAttribute("href", "/kalendarz?wizyta=v1");
  });

  it("marks a visit waiting for payment and the open one", () => {
    render(
      <ResourceCalendar
        ariaLabel="Kalendarz dnia"
        openVisitId="v2"
        view={specialistsDay}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByRole("link", { name: /Ola Wiśniewska.*czeka na płatność/ }),
    ).toHaveAttribute("href", "/kalendarz?wizyta=v3");
    expect(
      screen.getByRole("link", { name: /^Maria i Piotr Nowak/ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("shows the time now on today's columns only", () => {
    const { container } = render(
      <ResourceCalendar
        ariaLabel="Tydzień"
        view={annaWeek}
        visitHref={visitHref}
      />,
    );
    expect(container.querySelectorAll("[data-now-line]")).toHaveLength(1);
    expect(screen.getByText("Śr").closest("[aria-current]")).toHaveAttribute(
      "aria-current",
      "date",
    );
  });

  it("rooms show who works in them, and an online column", () => {
    render(
      <ResourceCalendar
        ariaLabel="Kalendarz dnia"
        view={roomsDay}
        visitHref={visitHref}
      />,
    );
    expect(screen.getByRole("group", { name: /^Online/ })).toBeInTheDocument();
    expect(
      screen.getAllByRole("note", { name: /Anna Kłobuchowska/ }),
    ).toHaveLength(1);
  });

  it("says when there is nobody to show", () => {
    render(
      <ResourceCalendar
        ariaLabel="Kalendarz dnia"
        empty="Brak aktywnych specjalistów."
        view={{ ...specialistsDay, columns: [] }}
        visitHref={visitHref}
      />,
    );
    expect(
      screen.getByText("Brak aktywnych specjalistów."),
    ).toBeInTheDocument();
  });
});
