import { HeartHandshake, Leaf, User, Users } from "lucide-react";
import type { OfferService } from "./offer-tile";

// Sample offer for Storybook and examples. Not product data.
export const sampleServices = [
  {
    title: "Psychoterapia indywidualna",
    description: "Przestrzeń na Ciebie i Twoje potrzeby.",
    href: "#indywidualna",
    icon: <User />,
    paint: "sage-1",
  },
  {
    title: "Psychoterapia par",
    description: "Lepsza komunikacja, większa bliskość.",
    href: "#pary",
    icon: <Users />,
    paint: "pink-1",
  },
  {
    title: "Wsparcie dla dzieci i młodzieży",
    description: "Zrozumienie, rozwój, bezpieczeństwo.",
    href: "#dzieci",
    icon: <HeartHandshake />,
    paint: "sage-2",
  },
  {
    title: "Konsultacje psychologiczne",
    description: "Pierwszy krok do zmiany.",
    href: "#konsultacje",
    icon: <Leaf />,
    paint: "pink-2",
  },
] as const satisfies readonly OfferService[];

export const sampleOfferCopy = {
  description:
    "Oferujemy terapię, konsultacje i warsztaty dopasowane do Twoich potrzeb.",
  cta: { href: "#oferta", label: "Zobacz całą ofertę" },
};
