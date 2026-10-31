import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { AvailabilityCalendar } from "./availability-calendar";
import { availabilityCalendarSample } from "./compact-booking-samples";
const meta = {
  title: "Public site/Availability calendar",
  component: AvailabilityCalendar,
  args: {
    ...availabilityCalendarSample,
    onViewChange: fn(),
    onNavigate: fn(),
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink max-w-xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AvailabilityCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Week: Story = {};
export const Month: Story = { args: { view: "month" } };
export const LoadingWeek: Story = { args: { status: "loading", days: [] } };
export const LoadingMonth: Story = {
  args: { view: "month", status: "loading", days: [] },
};
export const Failed: Story = { args: { status: "error", days: [] } };
export const NoTimes: Story = { args: { days: [] } };
