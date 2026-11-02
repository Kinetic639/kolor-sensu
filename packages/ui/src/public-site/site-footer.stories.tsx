import type { Meta, StoryObj } from "@storybook/react";
import { defaultCrisisHelp } from "@repo/contracts";
import { useState } from "react";
import { BookingField, ConsentCheckbox } from "../booking/booking-fields";
import { PrimaryButton } from "./actions";
import { SiteFooter } from "./site-footer";
import {
  sampleAbout,
  sampleContact,
  sampleLegal,
  sampleNavigation,
  sampleSocials,
} from "./site-samples";

function SignupPreview() {
  const [active, setActive] = useState(false);
  return (
    <div className="ks-newsletter-compact">
      <div className="ks-newsletter-compact__copy">
        <h2 className="ks-newsletter-compact__heading">Newsletter</h2>
        <p className="text-small text-text-muted">
          Artykuły i nowości z centrum. Raz w miesiącu.
        </p>
      </div>
      <form
        className="ks-newsletter-signup grid gap-4"
        aria-label="Zapis na newsletter"
        onFocus={() => setActive(true)}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="ks-newsletter-signup__row">
          <BookingField
            label="Adres e-mail"
            placeholder="Adres e-mail"
            type="email"
            name="email"
            autoComplete="email"
          />
          <div className="ks-newsletter-signup__submit">
            <PrimaryButton
              disabled
              className="disabled:bg-[#dedede] disabled:text-[#606060] disabled:opacity-100 disabled:shadow-none"
            >
              Zapisz się
            </PrimaryButton>
          </div>
        </div>
        {active ? (
          <ConsentCheckbox
            name="consent"
            text="Chcę otrzymywać newsletter Kolor Sensu. Więcej w"
            linkHref="/polityka-prywatnosci"
            linkLabel="polityce prywatności"
          />
        ) : null}
      </form>
    </div>
  );
}
const meta = {
  title: "Public site/Painted footer",
  component: SiteFooter,
  decorators: [
    (Story) => (
      <div className="bg-bg text-ink font-body pt-12">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
  args: {
    crisisLines: defaultCrisisHelp.lines,
    navigation: sampleNavigation,
    contact: sampleContact,
    about: sampleAbout,
    legal: sampleLegal,
    socials: sampleSocials,
    year: 2026,
    newsletter: <SignupPreview />,
  },
} satisfies Meta<typeof SiteFooter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const ManyServices: Story = {
  args: {
    navigation: [
      ...sampleNavigation.filter(
        (item) => !("footerColumn" in item && item.footerColumn),
      ),
      {
        label: "Oferta",
        href: "/oferta",
        footerColumn: true,
        children: Array.from({ length: 24 }, (_, i) => ({
          label: `Konsultacje i wsparcie psychologiczne ${i + 1}`,
          href: `/oferta/usluga-${i + 1}`,
        })),
      },
    ],
  },
};
