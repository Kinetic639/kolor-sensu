import type { ServiceCategory } from "@repo/contracts";
import {
  Brain,
  HeartHandshake,
  MessagesSquare,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import type { OfferPaint } from "./offer-tile";

// How a service looks on the site, wherever it is shown (the offer's
// tiles, the admin's list and preview): its icon by category, and its
// watercolor patch by its place in the offer.

/** The icon of a service tile, by the service's category. */
export const SERVICE_ICONS: Record<ServiceCategory, ReactNode> = {
  consultation: <MessagesSquare />,
  psychotherapy: <User />,
  couples_therapy: <Users />,
  assessment: <Brain />,
  workshop_related: <Sparkles />,
  other: <HeartHandshake />,
};

/** Its name as the site shows it: from a capital letter. */
export function serviceDisplayName(name: string) {
  const trimmed = name.trim();
  return trimmed.charAt(0).toLocaleUpperCase("pl-PL") + trimmed.slice(1);
}

const PAINT_ORDER: OfferPaint[] = ["sage-1", "pink-1", "sage-2", "pink-2"];

/** The patch of the service at that place in the offer (none, -1: the first). */
export function offerPaintAt(index: number): OfferPaint {
  return PAINT_ORDER[Math.max(0, index) % PAINT_ORDER.length]!;
}
