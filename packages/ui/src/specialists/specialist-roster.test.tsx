import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "../toast";
import { SpecialistOfferTable } from "./specialist-offers";
import { SpecialistRoster } from "./specialist-roster";
import type { OfferStateAction } from "./types";
import { SAMPLE_OFFERS, SAMPLE_SPECIALISTS } from "./specialists.samples";

vi.mock("../toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const [anna, michal] = SAMPLE_SPECIALISTS as [
  (typeof SAMPLE_SPECIALISTS)[number],
  (typeof SAMPLE_SPECIALISTS)[number],
];

const week = {
  label: "5–11 października 2030",
  previousHref: "/specjalisci?tydzien=2030-09-28",
  nextHref: "/specjalisci?tydzien=2030-10-12",
  currentHref: null,
};

function renderRoster({
  query = "",
  onUrlUpdate,
  action,
}: {
  query?: string;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  action?: OfferStateAction;
} = {}) {
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={query}>
      <SpecialistRoster
        empty="Nikt nie pasuje."
        offerAction={action ? () => action : undefined}
        offers={{ [anna.id]: SAMPLE_OFFERS }}
        rows={SAMPLE_SPECIALISTS}
        summary="Zespół: 59 wizyt"
        visitHref={(id) => `/rezerwacje?wizyta=${id}`}
        week={week}
      />
    </NuqsTestingAdapter>,
  );
}

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
});

describe("SpecialistRoster", () => {
  it("a row each: the week, how booked, now, the state; all closed", () => {
    renderRoster();
    const row = screen.getByRole("article", { name: "Anna Kłobuchowska" });
    expect(
      within(row).getByRole("list", { name: "Tydzień: Anna Kłobuchowska" }),
    ).toBeInTheDocument();
    expect(row).toHaveTextContent("78%");
    expect(row).toHaveTextContent("Wizyta online do 10:50");
    // No tags in the row: the segments above sort them out.
    expect(row).not.toHaveTextContent("Nie przyjmuje nowych");
    expect(row).not.toHaveTextContent("Opublikowany");
    expect(
      within(row).getByRole("button", { name: /^Anna Kłobuchowska/ }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(within(row).queryByRole("tabpanel")).toBeNull();
    // The week's bar.
    expect(
      screen.getByRole("link", { name: "Następny tydzień" }),
    ).toHaveAttribute("href", "/specjalisci?tydzien=2030-10-12");
    expect(screen.getByText("Zespół: 59 wizyt")).toBeVisible();
  });

  it("opens in place on the week; the address keeps it", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderRoster({ onUrlUpdate });
    const row = screen.getByRole("article", { name: "Anna Kłobuchowska" });
    await userEvent.click(
      within(row).getByRole("button", { name: /^Anna Kłobuchowska/ }),
    );
    expect(within(row).getByRole("tab", { name: "Tydzień" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(row).getByRole("tabpanel")).toHaveTextContent("Czw");
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe(
      `?otwarte=${anna.id}`,
    );
  });

  it("open from the address on a tab; the arrows move between tabs", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderRoster({ query: `?otwarte=${anna.id}:wizyty`, onUrlUpdate });
    const row = screen.getByRole("article", { name: "Anna Kłobuchowska" });
    const visits = within(row).getByRole("tab", { name: /Najbliższe wizyty/ });
    expect(visits).toHaveAttribute("aria-selected", "true");
    const table = within(row).getByRole("table", { name: "Najbliższe wizyty" });
    expect(
      within(table).getByRole("link", { name: "Piotr Zieliński" }),
    ).toHaveAttribute("href", "/rezerwacje?wizyta=visit-2030-10-08-13:00");
    expect(table).toHaveTextContent("Czeka na płatność");

    visits.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(within(row).getByRole("tab", { name: /Usługi/ })).toHaveFocus();
    expect(onUrlUpdate.mock.calls.at(-1)![0].queryString).toBe(
      `?otwarte=${anna.id}:uslugi`,
    );
  });

  it("the row's end leads to their page; a click elsewhere opens the row", async () => {
    renderRoster();
    const row = screen.getByRole("article", { name: "Michał Stępień" });
    expect(
      within(row).getByRole("link", { name: "Otwórz stronę: Michał Stępień" }),
    ).toHaveAttribute("href", `/specjalisci/${michal.id}`);
    expect(within(row).queryByRole("button", { name: /^Akcje/ })).toBeNull();
    await userEvent.click(
      within(row).getByText("Dyżur · Gabinet Niebieski · wolny"),
    );
    expect(
      within(row).getByRole("button", { name: /^Michał Stępień/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("the services: a switch saves at once", async () => {
    const action = vi.fn<OfferStateAction>().mockResolvedValue({ ok: true });
    renderRoster({ query: `?otwarte=${anna.id}:uslugi`, action });
    await userEvent.click(
      screen.getByRole("switch", { name: "Nowi klienci: Terapia dla par" }),
    );
    expect(action).toHaveBeenCalledWith({
      offerId: "offer-2",
      active: true,
      acceptingNewClients: true,
    });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("nobody: says so", () => {
    render(
      <NuqsTestingAdapter>
        <SpecialistRoster
          empty="Nikt nie pasuje."
          offers={{}}
          rows={[]}
          visitHref={(id) => id}
          week={week}
        />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByText("Nikt nie pasuje.")).toBeVisible();
  });
});

describe("SpecialistOfferTable", () => {
  it("refused: the switch goes back and the reason shows", async () => {
    const action = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Brak uprawnień." });
    render(<SpecialistOfferTable action={action} offers={SAMPLE_OFFERS} />);
    const toggle = screen.getByRole("switch", {
      name: "Oferta aktywna: Konsultacja psychologiczna",
    });
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Nie udało się zapisać oferty", {
        description: "Brak uprawnień.",
      }),
    );
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it("without an action, only the state", () => {
    render(<SpecialistOfferTable offers={SAMPLE_OFFERS} />);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getAllByText("Tak").length).toBeGreaterThan(0);
  });
});
