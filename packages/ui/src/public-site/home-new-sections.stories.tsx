import { plainHeader } from "@repo/contracts/section-header";
import type { Meta, StoryObj } from "@storybook/react";
import { CrisisStrip } from "./crisis-strip";
import { NewsletterBand } from "./newsletter-band";
import { WhyUsSection } from "./why-us-section";

// The homepage's sections added on 18.10, with the site's default words:
// "Dlaczego my", the newsletter band and the crisis strip. Plain styling
// for now; the look comes once they work end to end.

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

/** The newsletter band (the form joins once the tool is chosen). */
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
