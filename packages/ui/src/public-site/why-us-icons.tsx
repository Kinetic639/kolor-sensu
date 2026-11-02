import type { WhyUsIcon } from "@repo/contracts/cms";
import {
  BadgeCheck,
  BookOpen,
  GraduationCap,
  HandHeart,
  Heart,
  HeartHandshake,
  Leaf,
  LockKeyhole,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const icons = {
  "shield-check": ShieldCheck,
  "heart-handshake": HeartHandshake,
  "graduation-cap": GraduationCap,
  "badge-check": BadgeCheck,
  users: Users,
  heart: Heart,
  leaf: Leaf,
  "lock-keyhole": LockKeyhole,
  "messages-square": MessagesSquare,
  sparkles: Sparkles,
  "book-open": BookOpen,
  "hand-heart": HandHeart,
};
export const WHY_US_ICON_LABELS: Record<WhyUsIcon, string> = {
  "shield-check": "Bezpieczeństwo",
  "heart-handshake": "Zaufanie",
  "graduation-cap": "Wiedza",
  "badge-check": "Jakość",
  users: "Zespół",
  heart: "Serce",
  leaf: "Rozwój",
  "lock-keyhole": "Poufność",
  "messages-square": "Rozmowa",
  sparkles: "Inspiracja",
  "book-open": "Edukacja",
  "hand-heart": "Wsparcie",
};
export const DEFAULT_WHY_US_ICONS: readonly WhyUsIcon[] = [
  "shield-check",
  "lock-keyhole",
  "graduation-cap",
  "heart-handshake",
];
export function WhyUsIconMark({ name }: { name: WhyUsIcon }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" strokeWidth={1.6} />;
}
