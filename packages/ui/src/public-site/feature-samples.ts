import type { FeatureSectionProps } from "./feature-section";

// Sample feature sections for Storybook and examples (photos served by
// Storybook from apps/storybook/public/kolor-sensu). Not product copy.

export const sampleRooms = {
  eyebrow: "Nasze gabinety",
  heading: "Przestrzeń, która wspiera",
  description:
    "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
  cta: { href: "#gabinety", label: "Zobacz nasze gabinety" },
  image: {
    src: "/kolor-sensu/room.jpg",
    alt: "Gabinet z beżowym fotelem, stolikiem i roślinami",
  },
  imagePosition: "left",
} satisfies FeatureSectionProps;

export const sampleWorkshops = {
  eyebrow: "Warsztaty i rozwój",
  heading: "Wydarzenia, które inspirują",
  description:
    "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
  cta: { href: "#warsztaty", label: "Zobacz nadchodzące wydarzenia" },
  image: {
    src: "/kolor-sensu/group.jpg",
    alt: "Uczestnicy warsztatu rozmawiają w kręgu",
  },
  imagePosition: "right",
} satisfies FeatureSectionProps;
