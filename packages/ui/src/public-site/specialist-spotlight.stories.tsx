import { CompactBookingCalendar } from "./compact-booking-calendar";
import { AvailabilityCalendar } from "./availability-calendar";
import {
  compactBookingSample,
  availabilityCalendarSample,
} from "./compact-booking-samples";
import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";
import { SpecialistSpotlight } from "./specialist-spotlight";

// SpecialistSpotlight ("Z kim porozmawiasz"): one specialist presented at
// length, the cards' cut-out portrait on its splash, only larger. The CMS
// chooses whom; it shows instead of, or besides, "Poznaj nasz zespół".

const meta = {
  title: "Public site/Specialist spotlight",
  component: SpecialistSpotlight,
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink">
        <Story />
      </div>
    ),
  ],
  parameters: { layout: "fullscreen" },
  argTypes: {
    background: {
      control: "select",
      options: ["01", "02", "03", "04", "05", "06", "06b"],
    },
  },
  args: {
    eyebrow: "Poznaj nasz zespół",
    heading: "Z kim porozmawiasz",
    description:
      "Pierwsza rozmowa jest po to, żeby się poznać i sprawdzić, czy ta forma pomocy jest dla Ciebie.",
    specialist: {
      name: "Anna Nowak",
      role: "Psychoterapeutka",
      href: "#anna-nowak",
      portraitSrc: "/kolor-sensu/anna-nowak.png",
      splash: "pink-1",
      bio: "Pracuję z dorosłymi i parami, które przeżywają trudny czas: kryzys, stratę, lęk albo po prostu zmęczenie. W gabinecie jest miejsce na wszystko, co przynosisz.",
      facts: [
        {
          label: "W czym pomagam",
          items: ["lęk i stres", "kryzysy", "relacje", "żałoba"],
        },
        { label: "Z kim pracuję", items: ["dorośli", "pary"] },
        { label: "Formy pracy", items: ["w gabinecie", "online"] },
      ],
    },
    booking: { href: "#umow-wizyte", label: "Umów wizytę" },
  },
} satisfies Meta<typeof SpecialistSpotlight>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 3, name: "Anna Nowak" }),
    ).toBeVisible();
  },
};

/** With the cards' entrance: the portrait lifts in, the splash blooms. */
export const Animated: Story = {
  args: { animationPreset: "splash-reveal" },
};

export const WithCalendar: Story = {
  args: {
    bookingPanel: (
      <CompactBookingCalendar
        {...compactBookingSample}
        onChange={() => {}}
        calendar={
          <AvailabilityCalendar
            {...availabilityCalendarSample}
            onViewChange={() => {}}
            onNavigate={() => {}}
            onRetry={() => {}}
          />
        }
      />
    ),
  },
};
