import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { RoomRoster } from "./room-roster";
import { SAMPLE_ROOMS } from "./rooms.samples";

const [blue] = SAMPLE_ROOMS as [(typeof SAMPLE_ROOMS)[number]];

const week = {
  label: "5–11 października 2030",
  previousHref: "/gabinety?tydzien=2030-09-28",
  nextHref: "/gabinety?tydzien=2030-10-12",
  currentHref: null,
};

const renderRoster = (query = "") =>
  render(
    <NuqsTestingAdapter searchParams={query}>
      <RoomRoster empty="Żaden gabinet." rows={SAMPLE_ROOMS} week={week} />
    </NuqsTestingAdapter>,
  );

describe("RoomRoster", () => {
  it("a row each: hours, the week, now, today on a line", () => {
    renderRoster();
    const row = screen.getByRole("article", { name: "Gabinet Niebieski" });
    expect(row).toHaveTextContent("Pn–Pt 08:00–20:00");
    expect(
      within(row).getByRole("list", { name: "Tydzień: Gabinet Niebieski" }),
    ).toBeInTheDocument();
    expect(row).toHaveTextContent("Dyżur: Michał Stępień · wolny");
    expect(
      within(row).getByRole("img", {
        name: "Dziś w gabinecie: Gabinet Niebieski",
      }),
    ).toBeInTheDocument();
    const hall = screen.getByRole("article", { name: "Sala warsztatowa" });
    expect(hall).toHaveTextContent("Bez godzin otwarcia");
    expect(hall).toHaveTextContent("Nieaktywny");
  });

  it("opens on today: the large line and who is on duty", async () => {
    renderRoster();
    const row = screen.getByRole("article", { name: "Gabinet Niebieski" });
    await userEvent.click(
      within(row).getByRole("button", { name: /^Gabinet Niebieski/ }),
    );
    const pane = within(row).getByRole("tabpanel");
    expect(within(row).getByRole("tab", { name: "Dziś" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(pane).toHaveTextContent("Michał Stępień · dyżur 08:00–12:00");
    expect(pane).toHaveTextContent("2 wizyty");
  });

  it("who uses it, the hours and the exceptions", async () => {
    renderRoster(`?otwarte=${blue.id}:kto`);
    const row = screen.getByRole("article", { name: "Gabinet Niebieski" });
    expect(within(row).getByRole("tabpanel")).toHaveTextContent("Pn, Czw");
    await userEvent.click(
      within(row).getByRole("tab", { name: /Godziny i wyjątki/ }),
    );
    const pane = within(row).getByRole("tabpanel");
    expect(
      within(pane).getByRole("region", { name: "Godziny otwarcia" }),
    ).toHaveTextContent("Sobzamknięty");
    expect(
      within(pane).getByRole("region", { name: "Wyjątki" }),
    ).toHaveTextContent("Zablokowany 16:00–20:00 · malowanie");
  });

  it("the row's button leads to the room's page, without opening the row", async () => {
    renderRoster();
    const row = screen.getByRole("article", { name: "Gabinet Niebieski" });
    const link = within(row).getByRole("link", {
      name: "Otwórz stronę: Gabinet Niebieski",
    });
    expect(link).toHaveAttribute("href", `/gabinety/${blue.id}`);
    expect(within(row).queryByRole("button", { name: /^Akcje/ })).toBeNull();
  });
});
