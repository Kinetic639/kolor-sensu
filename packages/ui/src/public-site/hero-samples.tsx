import { Heart, House, Leaf, Users } from "lucide-react";
import type { HeroSectionProps } from "./hero-section";

// Sample hero for Storybook and examples (photo served by Storybook from
// apps/storybook/public/kolor-sensu). Not product copy decisions.
export const sampleHero = {
  eyebrow: "Centrum psychoterapii i rozwoju",
  heading: "Więcej zrozumienia.",
  accent: "Więcej sensu.",
  description:
    "Psychoterapia, rozwój i wsparcie w bezpiecznej przestrzeni. Dla osób dorosłych, par, dzieci i młodzieży.",
  primaryAction: { label: "Umów wizytę", href: "#umow-wizyte" },
  secondaryAction: { label: "Poznaj nas", href: "#o-nas" },
  points: [
    { icon: <Leaf />, label: "Doświadczeni specjaliści" },
    { icon: <Users />, label: "Indywidualne podejście" },
    { icon: <House />, label: "Przytulne gabinety" },
    { icon: <Heart />, label: "Atmosfera zaufania", tone: "pink" },
  ],
  image: {
    src: "/kolor-sensu/therapy-room-upload.png",
    alt: "Jasny gabinet z fotelem, stolikiem i roślinami przy dużym oknie",
    caption: "Przestrzeń dla ważnych rozmów",
  },
} satisfies HeroSectionProps;
