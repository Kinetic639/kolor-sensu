import type { ServiceCategory } from "@repo/contracts";
import type { ServiceDay, ServiceVisit } from "@repo/scheduling";
import type { OfferPaint } from "../public-site/offer-tile";

// A service as the offer's roster and its page show it.

/** A specialist offering the service, at their price. */
export interface ServiceOffer {
  id: string;
  specialist: {
    id: string;
    name: string;
    title: string | null;
    initials: string;
    avatarUrl: string | null;
    /** Their colour (null: the automatic one, from the id). */
    color: string | null;
    /** Their page. */
    href: string;
  };
  /** `220 zł` */
  price: string;
  priceMinor: number;
  /** Theirs, else the service's. */
  durationMinutes: number;
  inPerson: boolean;
  online: boolean;
  active: boolean;
}

export interface ServiceRow {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  /** `Psychoterapia` */
  categoryLabel: string;
  /** Its page. */
  href: string;
  /** Its page on the site. */
  publicUrl: string;
  durationMinutes: number;
  /** Held after the visit (notes, getting ready). */
  afterMinutes: number;
  shortDescription: string | null;
  active: boolean;
  publiclyVisible: boolean;
  bookingEnabled: boolean;
  /** The client fills in the questionnaire when booking it online. */
  requiresIntake: boolean;
  /** For a child or a teenager: booked by a parent or guardian. */
  forMinors: boolean;
  sortOrder: number;
  /** Its catalogue in the site's menu (none: on the menu's first level). */
  catalog: { id: string; name: string } | null;
  /** Its place in the offer's layout, catalogues unfolded (1, 2, …). */
  order: number;
  /** Its place in the site's offer (1, 2, …); null: not on the site. */
  position: number | null;
  /** Its watercolor, as in the site's offer. */
  paint: OfferPaint;
  offers: ServiceOffer[];
  /** The week shown, day by day. */
  days: ServiceDay[];
  visitCount: number;
  /** The next visits, the soonest first. */
  upcoming: ServiceVisit[];
}
