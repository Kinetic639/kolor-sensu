import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, userEvent, within } from "storybook/test";
import { RosterBar } from "../resource-roster/roster-bar";
import { SortMenu } from "../resource-roster/sort-menu";
import {
  loadServiceListParams,
  serviceSegments,
  servicesWeekSummary,
  serviceSortOptions,
  shownServices,
} from "./params";
import { ServiceRoster } from "./service-roster";
import { ServiceSearch } from "./service-search";
import { SAMPLE_SERVICES } from "./services.samples";

// The centre's offer as a roster: a service a row with who leads it (the
// pictures overlapping, the one pointed at comes forward), its prices,
// where it is seen and its week; a click opens it in place on tabs (the
// specialists and their prices, the next visits, its tile on the site).

const THERAPY = SAMPLE_SERVICES[1]!.id;

function Offer({ query }: { query: string }) {
  const params = loadServiceListParams(new URLSearchParams(query));
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="flex min-h-[40rem] flex-col border border-[var(--border)]">
        <RosterBar
          action={
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-2 text-[0.8125rem]"
              type="button"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Dodaj usługę
            </button>
          }
          label="Które usługi"
          search={<ServiceSearch />}
          segments={serviceSegments("/oferta", params, SAMPLE_SERVICES)}
          sort={<SortMenu options={serviceSortOptions("/oferta", params)} />}
        />
        <ServiceRoster
          empty="Żadna usługa nie pasuje."
          rows={shownServices(SAMPLE_SERVICES, params)}
          summary={servicesWeekSummary(SAMPLE_SERVICES)}
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
  title: "Portal/Services",
  component: Offer,
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
} satisfies Meta<typeof Offer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every service closed; a click opens one on its specialists. */
export const Roster: Story = {
  args: { query: "" },
  play: async ({ canvas }) => {
    const row = canvas.getByRole("article", { name: "Terapia dla par" });
    await userEvent.click(
      within(row).getByRole("button", { name: /^Terapia dla par/ }),
    );
    await expect(
      within(row).getByRole("tab", { name: /Specjaliści i ceny/ }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

/** The next visits of a service. */
export const Visits: Story = {
  args: { query: `?otwarte=${THERAPY}:wizyty` },
};

/** Its tile as the site shows it, and what it still needs. */
export const OnTheSite: Story = {
  args: { query: `?otwarte=${THERAPY}:strona` },
};

/** Only what keeps clients away. */
export const NeedsAttention: Story = {
  args: { query: "?stan=do-uwagi" },
};

export const Mobile: Story = {
  args: { query: `?otwarte=${THERAPY}` },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
