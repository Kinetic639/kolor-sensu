import type { Meta, StoryObj } from "@storybook/react";
import { PaintedStory } from "./painted-story";
import {
  EducationArticles,
  EducationBooks,
  EducationWorkshopCard,
} from "./education-media";
import { plainHeader } from "@repo/contracts/section-header";
import { sampleWorkshops } from "./workshop-samples";
const photo = { src: "/kolor-sensu/room.jpg", alt: "Przestrzeń do rozmowy" };
const meta = {
  title: "Public site/Education story",
  component: PaintedStory,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="bg-bg text-ink font-body">
        <div className="h-[50vh]" />
        <Story />
        <div className="h-[50vh]" />
      </div>
    ),
  ],
  args: {
    header: plainHeader({
      eyebrow: "Edukacja",
      title: "Wiedza, która wspiera",
    }),
    steps: [
      {
        heading: "Artykuły, które pomagają zrozumieć",
        text: "Przystępne teksty o emocjach i relacjach.",
        image: photo,
        cta: { href: "#artykuly", label: "Więcej artykułów" },
        content: (
          <EducationArticles
            articles={[1, 2, 3].map((i) => ({
              id: String(i),
              title: `Codzienność z większą uważnością — część ${i}`,
              lead: "O sposobach na rozumienie własnych emocji i potrzeb.",
              category: "Emocje i myśli",
              reading: "3 min czytania",
              href: `#artykul-${i}`,
              image: photo,
            }))}
          />
        ),
      },
      {
        heading: "E-booki do spokojnej lektury",
        text: "Wiedza we własnym tempie.",
        image: photo,
        cta: { href: "#ebooki", label: "Poznaj e-booki" },
        content: (
          <EducationBooks
            books={[
              {
                id: "1",
                title: "Droga do spokoju",
                format: "PDF, 64 strony",
                href: "#ebook",
                image: photo,
              },
              {
                id: "2",
                title: "Ćwiczenia na co dzień",
                format: "PDF, 55 stron",
                href: "#ebook2",
                image: photo,
              },
            ]}
          />
        ),
      },
      {
        heading: "Warsztaty, które rozwijają",
        text: "Rozwijaj się w dobrym towarzystwie.",
        image: photo,
        cta: { href: "#warsztaty", label: "Zobacz warsztaty" },
        content: (
          <EducationWorkshopCard
            workshop={{
              ...sampleWorkshops[0]!,
              title: "Bliżej siebie",
              description: "Spotkanie o emocjach, potrzebach i relacjach.",
              coverUrl: photo.src,
              coverAlt: photo.alt,
              dateLabel: "czwartek, 19 listopada 2026",
              timeLabel: "18:00–20:00",
              placeLabel: "Online",
              href: "#warsztat",
            }}
          />
        ),
      },
    ],
  },
} satisfies Meta<typeof PaintedStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const AllCompositions: Story = {};
export const OneArticle: Story = {
  args: {
    steps: [
      {
        ...meta.args.steps[0]!,
        content: (
          <EducationArticles
            articles={[
              {
                id: "one",
                title: "Zrozumieć swoje myśli",
                lead: "Spokojnie o tym, co dzieje się w naszej głowie.",
                category: "Emocje",
                reading: "2 min czytania",
                href: "#article",
                image: photo,
              },
            ]}
          />
        ),
      },
    ],
  },
};
