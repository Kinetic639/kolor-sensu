import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { RoomAvailabilityExceptionItem, RoomStatusBadges } from "./room-admin";

const meta = {
  title: "Admin/Rooms",
  component: RoomStatusBadges,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RoomStatusBadges>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ActivePublished: Story = {
  args: { active: true, publiclyVisible: true, publicProfilePublished: true },
};
export const InactivePrivate: Story = {
  args: {
    active: false,
    publiclyVisible: false,
    publicProfilePublished: false,
  },
};
export const AvailabilityExceptions: Story = {
  args: {
    active: true,
    publiclyVisible: true,
    publicProfilePublished: true,
  },
  render: () => (
    <div className="max-w-2xl space-y-3">
      <RoomAvailabilityExceptionItem
        date="2026-12-24"
        type="closed_all_day"
        reason="Przerwa świąteczna"
        actions={
          <Button size="sm" variant="secondary">
            Edytuj
          </Button>
        }
      />
      <RoomAvailabilityExceptionItem
        date="2026-12-28"
        type="blocked_interval"
        startsAt="12:00"
        endsAt="15:00"
        reason="Konserwacja"
      />
      <RoomAvailabilityExceptionItem
        date="2026-12-30"
        type="extra_available_interval"
        startsAt="18:00"
        endsAt="20:00"
      />
    </div>
  ),
};
