import { plainHeader } from "@repo/contracts/section-header";
import type { Meta, StoryObj } from "@storybook/react";
import { BookingField, ConsentCheckbox } from "../booking/booking-fields";
import { PrimaryButton } from "./actions";
import { CrisisStrip } from "./crisis-strip";
import { NewsletterBand } from "./newsletter-band";
import { WhyUsSection } from "./why-us-section";

// The homepage's sections added on 18.10, with the site's default words:
// "Dlaczego my", the newsletter band and the crisis strip.

const meta = {
  title: "Public site/Home new sections",
  decorators: [
    (Story) => (
      <div className="bg-bg font-body text-ink min-h-screen overflow-x-clip">
        <Story />
      </div>
    ),
  ],
  parameters: { canvasPadding: false },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const facts = [
  {
    title: "Superwizja",
    text: "Każdy specjalista pracuje pod regularną superwizją.",
  },
  {
    title: "Poufność",
    text: "To, o czym mówisz w gabinecie, zostaje między Tobą a specjalistą.",
  },
  {
    title: "Doświadczenie",
    text: "Zespół z wieloletnią praktyką, który stale się szkoli.",
  },
  {
    title: "Kodeks etyczny",
    text: "Pracujemy zgodnie z kodeksami etyki zawodowej.",
  },
];

/** "Dlaczego my": four facts, under the areas of help. */
export const WhyUs: Story = {
  render: () => (
    <WhyUsSection
      facts={facts}
      header={plainHeader({
        eyebrow: "Dlaczego my",
        title: "Bezpieczna przestrzeń i doświadczony zespół",
      })}
    />
  ),
};

/** "Dlaczego my" with the fewest facts the CMS allows. */
export const WhyUsTwoFacts: Story = {
  name: "Why Us (two facts)",
  render: () => (
    <WhyUsSection
      facts={facts.slice(0, 2)}
      header={plainHeader({
        eyebrow: "Dlaczego my",
        title: "Bezpieczna przestrzeń",
      })}
    />
  ),
};

/** The newsletter band, without its form (as in the CMS until it is on). */
export const Newsletter: Story = {
  render: () => (
    <NewsletterBand
      header={plainHeader({
        eyebrow: "Newsletter",
        title: "Bądźmy w kontakcie",
        description: "Artykuły, warsztaty i nowości z centrum, raz w miesiącu.",
      })}
    />
  ),
};

/** The site's sign-up form, as the site puts it in the band (a stand-in). */
function SignupStandIn() {
  return (
    <form
      className="ks-newsletter-signup grid gap-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <div className="ks-newsletter-signup__row">
        <BookingField
          autoComplete="email"
          label="Adres e-mail"
          placeholder="Adres e-mail"
          name="email"
          type="email"
        />
        <div className="ks-newsletter-signup__submit">
          <PrimaryButton type="submit">Zapisz się</PrimaryButton>
        </div>
      </div>
      <ConsentCheckbox
        linkHref="/polityka-prywatnosci"
        linkLabel="polityce prywatności"
        name="consent"
        text="Chcę dostawać na ten adres newsletter Kolor Sensu: artykuły, warsztaty i nowości z centrum, mniej więcej raz w miesiącu. Mogę się wypisać w każdej chwili, linkiem w każdej wiadomości. Administratorem danych jest Kolor Sensu sp. z o.o. Więcej w"
      />
    </form>
  );
}

/** The newsletter band with the sign-up form beside its words. */
export const NewsletterWithForm: Story = {
  render: () => (
    <NewsletterBand
      header={plainHeader({
        eyebrow: "Newsletter",
        title: "Bądźmy w kontakcie",
        description: "Artykuły, warsztaty i nowości z centrum, raz w miesiącu.",
      })}
    >
      <SignupStandIn />
    </NewsletterBand>
  ),
};

/** The crisis strip with the default numbers, 112 first. */
export const Crisis: Story = {
  render: () => (
    <CrisisStrip
      heading="Potrzebujesz pomocy teraz?"
      lines={[
        {
          number: "112",
          label: "Numer alarmowy",
          detail: "gdy życie jest w bezpośrednim zagrożeniu",
        },
        {
          number: "800 702 222",
          label: "Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego",
          detail: "całodobowo, bezpłatnie",
        },
        {
          number: "116 123",
          label: "Kryzysowy Telefon Zaufania",
          detail: "dla dorosłych",
        },
        {
          number: "116 111",
          label: "Telefon Zaufania dla Dzieci i Młodzieży",
          detail: "całodobowo",
        },
      ]}
      text="Jeśli Twoje życie jest w zagrożeniu, dzwoń pod 112. Możesz też zadzwonić na bezpłatne linie wsparcia:"
    />
  ),
};
