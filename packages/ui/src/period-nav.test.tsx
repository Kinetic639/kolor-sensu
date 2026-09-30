import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeriodNav } from "./period-nav";

describe("PeriodNav", () => {
  it("links to the neighbouring weeks and back to this one", () => {
    render(
      <PeriodNav
        label="28 września – 4 października 2026"
        nextHref="?tydzien=2026-10-05"
        previousHref="?tydzien=2026-09-21"
        todayHref="?"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Poprzedni tydzień" }),
    ).toHaveAttribute("href", "?tydzien=2026-09-21");
    expect(
      screen.getByRole("link", { name: "Następny tydzień" }),
    ).toHaveAttribute("href", "?tydzien=2026-10-05");
    expect(screen.getByRole("link", { name: "Dziś" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Tydzień" }),
    ).toHaveTextContent("28 września – 4 października 2026");
  });

  it("has no Dziś link when the current period is shown; names days", () => {
    render(
      <PeriodNav
        label="środa, 30 września"
        nextHref="#n"
        previousHref="#p"
        unit="dzień"
      />,
    );
    expect(screen.queryByRole("link", { name: "Dziś" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Następny dzień" }),
    ).toBeInTheDocument();
  });
});
