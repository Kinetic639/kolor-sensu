import type { Specialist } from "./specialist-card";

// Sample team for Storybook and examples (portraits served by Storybook from
// apps/storybook/public/kolor-sensu). Not product data.
export const sampleSpecialists = [
  {
    name: "Anna Nowak",
    role: "Psychoterapeutka",
    href: "#anna-nowak",
    portraitSrc: "/kolor-sensu/anna-nowak.png",
    splash: "pink-1",
  },
  {
    name: "Tomasz Wójcik",
    role: "Psycholog",
    href: "#tomasz-wojcik",
    portraitSrc: "/kolor-sensu/tomasz-wojcik.png",
    splash: "sage-1",
  },
  {
    name: "Katarzyna Zielińska",
    role: "Psychoterapeutka",
    href: "#katarzyna-zielinska",
    portraitSrc: "/kolor-sensu/katarzyna-zielinska.png",
    splash: "pink-2",
  },
] as const satisfies readonly Specialist[];

export const sampleSpecialistsCopy = {
  description:
    "Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.",
  cta: { href: "#zespol", label: "Zobacz wszystkich specjalistów" },
};
