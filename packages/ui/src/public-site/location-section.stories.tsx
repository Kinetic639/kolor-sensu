import { plainHeader } from "@repo/contracts/section-header";
import type { Meta, StoryObj } from "@storybook/react";
import { LocationMapPlaceholder } from "./location-map-placeholder";
import { LocationSection } from "./location-section";

const contact = {
  address: { street: "ul. Długa 1", postalCode: "61-001", city: "Poznań" },
  phone: "+48123456789",
  phoneLabel: "+48 123 456 789",
  email: "kontakt@example.invalid",
  hours: "Poniedziałek–piątek, 8:00–20:00",
};
const meta = {
  title: "Public site/Location",
  component: LocationSection,
  decorators: [
    (Story) => (
      <div className="bg-bg text-ink font-body overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  args: {
    header: plainHeader({
      eyebrow: "Gdzie jesteśmy",
      title: "Odwiedź nas",
      cta: { href: "/kontakt", label: "Kontakt", style: "arrow" },
    }),
    contact,
    map: (
      <div className="ks-location-map">
        <LocationMapPlaceholder
          address="ul. Długa 1, 61-001 Poznań"
          onShowMap={() => {}}
        />
      </div>
    ),
  },
  parameters: { canvasPadding: false },
} satisfies Meta<typeof LocationSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AddressOnly: Story = {
  args: { contact: { address: contact.address } },
};
export const LongDetails: Story = {
  args: {
    contact: {
      ...contact,
      address: {
        street: "ul. Generała Józefa Zajączka 123, lokal 42, drugie piętro",
        postalCode: "61-001",
        city: "Poznań",
      },
      email: "bardzo-dlugi-adres-kontaktowy@example.invalid",
      hours:
        "Poniedziałek–piątek: 8:00–21:00\nSobota: po wcześniejszym umówieniu",
    },
  },
};
