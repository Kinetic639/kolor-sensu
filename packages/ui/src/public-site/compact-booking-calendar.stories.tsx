import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { CompactBookingCalendar } from "./compact-booking-calendar";
import { AvailabilityCalendar } from "./availability-calendar";
import {
  compactBookingSample,
  availabilityCalendarSample,
} from "./compact-booking-samples";
const meta = {
  title: "Public site/Compact booking calendar",
  component: CompactBookingCalendar,
  args: {
    ...compactBookingSample,
    onChange: fn(),
    calendar: (
      <AvailabilityCalendar
        {...availabilityCalendarSample}
        onViewChange={fn()}
        onNavigate={fn()}
        onRetry={fn()}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CompactBookingCalendar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {};
