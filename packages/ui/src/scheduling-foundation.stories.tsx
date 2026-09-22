import type { Meta, StoryObj } from "@storybook/react";
import { AvailabilityBlock } from "./availability-block";
import { ResourceHeader } from "./resource-header";
import {
  roomScheduleResources,
  scheduleAvailabilityFixtures,
  specialistScheduleResources,
  unavailableScheduleAvailability,
} from "./scheduling.fixtures";

const meta = {
  title: "Scheduling/SchedulingFoundation",
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function CalendarColumn({
  availability,
  resource,
}: {
  availability: Parameters<typeof AvailabilityBlock>[0]["availability"];
  resource: Parameters<typeof ResourceHeader>[0]["resource"];
}) {
  return (
    <div className="mx-auto w-56 max-w-full overflow-hidden border-x border-[var(--border)] bg-[var(--surface-subtle)]">
      <ResourceHeader resource={resource} />
      <div className="h-48 p-1.5">
        <AvailabilityBlock availability={availability} />
      </div>
    </div>
  );
}

export const SpecialistHeaderWithAvailability: Story = {
  render: () => (
    <CalendarColumn
      availability={scheduleAvailabilityFixtures.gabinet1}
      resource={specialistScheduleResources.anna}
    />
  ),
};

export const SpecialistHeaderNoAvailability: Story = {
  render: () => (
    <CalendarColumn
      availability={unavailableScheduleAvailability}
      resource={specialistScheduleResources.karolina}
    />
  ),
};

export const RoomHeaderWithAvailability: Story = {
  render: () => (
    <CalendarColumn
      availability={scheduleAvailabilityFixtures.gabinet2}
      resource={roomScheduleResources.gabinet2}
    />
  ),
};

export const RoomHeaderNoAvailability: Story = {
  render: () => (
    <CalendarColumn
      availability={unavailableScheduleAvailability}
      resource={roomScheduleResources.unavailable}
    />
  ),
};

export const OnlineAvailabilityExample: Story = {
  render: () => (
    <CalendarColumn
      availability={scheduleAvailabilityFixtures.online}
      resource={specialistScheduleResources.anna}
    />
  ),
};

export const HybridAvailabilityExample: Story = {
  render: () => (
    <CalendarColumn
      availability={scheduleAvailabilityFixtures.hybrid}
      resource={specialistScheduleResources.tomasz}
    />
  ),
};
