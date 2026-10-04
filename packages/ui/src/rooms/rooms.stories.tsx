import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { expect, userEvent, within } from "storybook/test";
import { RosterBar } from "../resource-roster/roster-bar";
import { SortMenu } from "../resource-roster/sort-menu";
import {
  loadRoomListParams,
  roomSegments,
  roomSortOptions,
  shownRooms,
} from "./params";
import { RoomRoster } from "./room-roster";
import { RoomSearch } from "./room-search";
import { SAMPLE_ROOMS } from "./rooms.samples";

// The centre's rooms as a roster: a row each with the week as a strip,
// what is happening now and today on a line of hours; a click opens it in
// place on tabs (today, who uses it, the hours and the exceptions).

const BLUE = SAMPLE_ROOMS[0]!.id;

function Rooms({ query }: { query: string }) {
  const params = loadRoomListParams(new URLSearchParams(query));
  return (
    <NuqsTestingAdapter searchParams={query}>
      <div className="flex h-[40rem] flex-col border border-[var(--border)]">
        <RosterBar
          action={
            <button
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-2 text-[0.8125rem]"
              type="button"
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Dodaj gabinet
            </button>
          }
          label="Które gabinety"
          search={<RoomSearch />}
          segments={roomSegments("/gabinety", params, SAMPLE_ROOMS)}
          sort={<SortMenu options={roomSortOptions("/gabinety", params)} />}
        />
        <RoomRoster
          empty="Żaden gabinet nie pasuje."
          rows={shownRooms(SAMPLE_ROOMS, params)}
          summary="Siedziba Główna"
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
  title: "Portal/Rooms",
  component: Rooms,
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
} satisfies Meta<typeof Rooms>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every room closed; a click opens one on today. */
export const Roster: Story = {
  args: { query: "" },
  play: async ({ canvas }) => {
    const row = canvas.getByRole("article", { name: "Gabinet Zielony" });
    await userEvent.click(
      within(row).getByRole("button", { name: /^Gabinet Zielony/ }),
    );
    await expect(
      within(row).getByRole("tab", { name: "Dziś" }),
    ).toHaveAttribute("aria-selected", "true");
  },
};

/** Who uses the room this week. */
export const Users: Story = {
  args: { query: `?otwarte=${BLUE}:kto` },
};

/** The hours and the exceptions. */
export const Hours: Story = {
  args: { query: `?otwarte=${BLUE}:godziny` },
};

/** Only the inactive ones. */
export const Inactive: Story = {
  args: { query: "?stan=nieaktywne" },
};

export const Mobile: Story = {
  args: { query: `?otwarte=${BLUE}` },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
