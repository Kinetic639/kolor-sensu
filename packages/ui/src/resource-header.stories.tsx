import type { Meta, StoryObj } from "@storybook/react";
import { ResourceHeader } from "./resource-header";
import {
  roomScheduleResources,
  specialistScheduleResources,
} from "./scheduling.fixtures";

const meta = {
  title: "Scheduling/ResourceHeader",
  component: ResourceHeader,
  decorators: [
    (Story) => (
      <div className="w-56 max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResourceHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpecialistDefault: Story = {
  args: { resource: specialistScheduleResources.anna },
};

export const SpecialistHighOccupancy: Story = {
  args: {
    resource: {
      ...specialistScheduleResources.anna,
      id: "anna-high-occupancy",
      bookedMinutes: 420,
      appointmentCount: 7,
    },
  },
};

export const SpecialistLowOccupancy: Story = {
  args: {
    resource: {
      ...specialistScheduleResources.tomasz,
      id: "tomasz-low-occupancy",
      bookedMinutes: 120,
      appointmentCount: 2,
    },
  },
};

export const SpecialistNoAvailability: Story = {
  args: { resource: specialistScheduleResources.karolina },
};

export const RoomSage: Story = {
  args: { resource: roomScheduleResources.gabinet1 },
};

export const RoomPeach: Story = {
  args: { resource: roomScheduleResources.gabinet2 },
};

export const RoomLavender: Story = {
  args: { resource: roomScheduleResources.gabinet3 },
};

export const RoomNoAvailability: Story = {
  args: { resource: roomScheduleResources.unavailable },
};

export const ContainerWidths: Story = {
  args: { resource: specialistScheduleResources.anna },
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
          <ResourceHeader {...args} />
        </div>
      ))}
    </div>
  ),
};
