import type { Meta, StoryObj } from "@storybook/react";
import { AvailabilityBlock } from "./availability-block";
import {
  scheduleAvailabilityFixtures,
  unavailableScheduleAvailability,
} from "./scheduling.fixtures";

const meta = {
  title: "Scheduling/AvailabilityBlock",
  component: AvailabilityBlock,
  decorators: [
    (Story, context) => (
      <div
        className={
          context.args.variant === "compact"
            ? "h-16 w-56 max-w-full"
            : "h-32 w-64 max-w-full"
        }
      >
        <Story />
      </div>
    ),
  ],
  args: {
    timeZone: "Europe/Warsaw",
  },
} satisfies Meta<typeof AvailabilityBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RoomSage: Story = {
  args: { availability: scheduleAvailabilityFixtures.gabinet1 },
};

export const RoomSageCompact: Story = {
  args: {
    availability: scheduleAvailabilityFixtures.gabinet1,
    variant: "compact",
  },
};

export const RoomPeach: Story = {
  args: { availability: scheduleAvailabilityFixtures.gabinet2 },
};

export const RoomLavender: Story = {
  args: { availability: scheduleAvailabilityFixtures.gabinet3 },
};

export const Online: Story = {
  args: { availability: scheduleAvailabilityFixtures.online },
};

export const OnlineCompact: Story = {
  args: {
    availability: scheduleAvailabilityFixtures.online,
    variant: "compact",
  },
};

export const Hybrid: Story = {
  args: { availability: scheduleAvailabilityFixtures.hybrid },
};

export const HybridCompact: Story = {
  args: {
    availability: scheduleAvailabilityFixtures.hybrid,
    variant: "compact",
  },
};

export const LongRange: Story = {
  args: { availability: scheduleAvailabilityFixtures.gabinet1 },
};

export const ShortRange: Story = {
  args: {
    availability: {
      ...scheduleAvailabilityFixtures.online,
      id: "availability-online-short",
      start: "2025-04-14T16:00:00+02:00",
      end: "2025-04-14T16:30:00+02:00",
    },
  },
};

export const Unavailable: Story = {
  args: { availability: unavailableScheduleAvailability },
};

export const UnavailableCompact: Story = {
  args: {
    availability: unavailableScheduleAvailability,
    variant: "compact",
  },
};

export const ContainerWidths: Story = {
  args: { availability: scheduleAvailabilityFixtures.hybrid },
  decorators: [],
  render: (args) => (
    <div className="flex w-full flex-wrap items-start gap-6 p-4">
      {[
        { label: "Narrow · 176 px", width: "w-44" },
        { label: "Normal · 224 px", width: "w-56" },
        { label: "Wide · 320 px", width: "w-80" },
      ].map((container) => (
        <div className={container.width} key={container.label}>
          <p className="mb-2 text-[10px] text-[var(--text-muted)]">
            {container.label}
          </p>
          <div className="h-24">
            <AvailabilityBlock {...args} />
          </div>
        </div>
      ))}
    </div>
  ),
};
