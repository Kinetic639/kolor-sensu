import type { Meta, StoryObj } from "@storybook/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, fn, userEvent, within } from "storybook/test";
import { RosterBar } from "../resource-roster/roster-bar";
import { SortMenu } from "../resource-roster/sort-menu";
import {
  loadSpecialistListParams,
  shownSpecialists,
  specialistSegments,
  specialistSortOptions,
} from "./params";
import { SpecialistRoster } from "./specialist-roster";
import { SpecialistSearch } from "./specialist-search";
import { SAMPLE_OFFERS, SAMPLE_SPECIALISTS } from "./specialists.samples";

// The centre's team as a roster: a row each with the week as a strip, how
// booked, what they are doing now and their state; a click opens it in
// place on tabs (the week, the next visits, the services).

const save = fn(async () => ({ ok: true as const }));
const ANNA = SAMPLE_SPECIALISTS[0]!.id;

function Team({ query }: { query: string }) {
  const params = loadSpecialistListParams(new URLSearchParams(query));
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="flex h-[44rem] flex-col border border-[var(--border)]">
        <RosterBar
          label="Którzy specjaliści"
          search={<SpecialistSearch />}
          segments={specialistSegments(
            "/specjalisci",
            params,
            SAMPLE_SPECIALISTS,
          )}
          sort={
            <SortMenu options={specialistSortOptions("/specjalisci", params)} />
          }
        />
        <SpecialistRoster
          empty="Nikt nie pasuje do wyszukiwania."
          offerAction={() => save}
          offers={Object.fromEntries(
            SAMPLE_SPECIALISTS.map((row) => [row.id, SAMPLE_OFFERS]),
          )}
          rows={shownSpecialists(SAMPLE_SPECIALISTS, params)}
          summary="Zespół: 26 wizyt · 61% obłożenia"
          visitHref={(id) => `/rezerwacje?wizyta=${id}`}
          week={{
            label: "5–11 października 2030",
            previousHref: "?tydzien=2030-09-28",
            nextHref: "?tydzien=2030-10-12",
            currentHref: null,
          }}
        />
      </div>
    </NuqsTestingAdapter>
  );
}

const meta = {
  title: "Portal/Specialists",
  component: Team,
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Team>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Everyone closed; a click opens a row in place. */
export const Roster: Story = {
  args: { query: "" },
  play: async ({ canvas }) => {
    const row = canvas.getByRole("article", { name: "Michał Stępień" });
    const toggle = within(row).getByRole("button", { name: /^Michał Stępień/ });
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
      within(row).getByRole("tab", { name: "Tydzień" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

/** Open on the next visits, from the address. */
export const NextVisits: Story = {
  args: { query: `?otwarte=${ANNA}:wizyty` },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("table", { name: "Najbliższe wizyty" }),
    ).toBeVisible();
  },
};

/** Open on the services; a switch saves at once. */
export const Services: Story = {
  args: { query: `?otwarte=${ANNA}:uslugi` },
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole("switch", { name: "Oferta aktywna: Terapia dla par" }),
    );
    await expect(save).toHaveBeenCalled();
  },
};

/** The busiest first. */
export const ByOccupancy: Story = {
  args: { query: "?sort=oblozenie" },
};

/** Nobody matches. */
export const NothingFound: Story = {
  args: { query: "?q=xyz" },
};

export const Mobile: Story = {
  args: { query: `?otwarte=${ANNA}` },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
