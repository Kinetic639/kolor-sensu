import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { ServiceRoster } from "./service-roster";
import { SAMPLE_SERVICES } from "./services.samples";

const week = {
  label: "5–11 października 2030",
  previousHref: "/oferta?tydzien=2030-09-28",
  nextHref: "/oferta?tydzien=2030-10-12",
  currentHref: null,
};

const renderRoster = (query = "") =>
  render(
    <NuqsTestingAdapter searchParams={query}>
      <ServiceRoster
        empty="Żadna usługa."
        rows={SAMPLE_SERVICES}
        visitHref={(id) => `/rezerwacje?wizyta=${id}`}
        week={week}
      />
    </NuqsTestingAdapter>,
  );

const therapy = SAMPLE_SERVICES[1]!;

describe("ServiceRoster", () => {
  it("a row each: who leads it, the prices, where it is seen, the week", () => {
    renderRoster();
    const row = screen.getByRole("article", {
      name: "Psychoterapia indywidualna",
    });
    expect(row).toHaveTextContent("Psychoterapia · 50 min");
    // The pictures only, with the names for screen readers; no count.
    const leads = within(row).getByRole("list", { name: "Prowadzą" });
    expect(within(leads).getAllByRole("listitem")).toHaveLength(2);
    expect(leads).toHaveTextContent("Michał Stępień");
    expect(row).not.toHaveTextContent("2 osoby");
    expect(row).toHaveTextContent("220–240 zł");
    expect(row).toHaveTextContent("50 / 60 min");
    expect(row).toHaveTextContent("Aktywna · na stronie");
    expect(row).toHaveTextContent("Z rezerwacją online");
    expect(row).not.toHaveTextContent("przyjmuj");
    expect(
      within(row).getByRole("img", { name: "Wizyty w tym tygodniu: 9" }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("link", {
        name: "Otwórz stronę: Psychoterapia indywidualna",
      }),
    ).toHaveAttribute("href", therapy.href);
  });

  it("says whether a service is on and seen, or what keeps clients away", () => {
    renderRoster();
    const assessment = screen.getByRole("article", {
      name: "Diagnoza psychologiczna",
    });
    expect(assessment).toHaveTextContent("Nikt nie prowadzi");
    expect(assessment).toHaveTextContent("Nieaktywna");
  });

  it("opens on the specialists and their prices", async () => {
    renderRoster();
    const row = screen.getByRole("article", {
      name: "Psychoterapia indywidualna",
    });
    await userEvent.click(
      within(row).getByRole("button", { name: /^Psychoterapia indywidualna/ }),
    );
    const table = within(row).getByRole("table", {
      name: "Specjaliści i ceny",
    });
    expect(
      within(table).getByRole("link", { name: "Anna Kłobuchowska" }),
    ).toHaveAttribute("href", therapy.offers[1]!.specialist.href);
    // Her own time stands out.
    expect(
      within(table).getByTitle("Własny czas (usługa: 50 min)"),
    ).toHaveTextContent("60 min");
  });

  it("the next visits and the tile on the site", async () => {
    renderRoster(`?otwarte=${therapy.id}:wizyty`);
    const row = screen.getByRole("article", {
      name: "Psychoterapia indywidualna",
    });
    expect(
      within(row).getByRole("link", { name: "Marta Lis" }),
    ).toHaveAttribute("href", "/rezerwacje?wizyta=v4");
    await userEvent.click(within(row).getByRole("tab", { name: "Na stronie" }));
    const pane = within(row).getByRole("tabpanel");
    expect(
      within(pane).getByRole("heading", { name: "Psychoterapia indywidualna" }),
    ).toBeInTheDocument();
    expect(pane).toHaveTextContent("/oferta/psychoterapia-indywidualna");
    expect(pane).toHaveTextContent("2. w ofercie na stronie");
    expect(
      within(pane).getByRole("list", { name: "Gotowość" }),
    ).toHaveTextContent("Widoczna na stronie");
  });

  it("in the offer's order: each catalogue's services together, named", () => {
    render(
      <NuqsTestingAdapter>
        <ServiceRoster
          empty="Żadna usługa."
          grouped
          rows={SAMPLE_SERVICES}
          visitHref={(id) => id}
          week={week}
        />
      </NuqsTestingAdapter>,
    );
    const catalog = screen.getByRole("region", { name: "Katalog: Terapie" });
    expect(
      within(catalog).getByRole("heading", { name: /Terapie · 2 usługi/ }),
    ).toBeInTheDocument();
    expect(within(catalog).getAllByRole("article")).toHaveLength(2);
    expect(
      within(catalog).queryByRole("article", {
        name: "Konsultacja psychologiczna",
      }),
    ).toBeNull();
  });
});
