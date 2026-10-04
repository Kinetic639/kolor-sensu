import type {
  NowStatus,
  Occupancy,
  UpcomingVisit,
  WeekDay,
} from "@repo/scheduling";

// A specialist as the team's roster and their page show them.

export type SpecialistProfileState =
  | "published"
  | "draft"
  | "rejected"
  /** A draft waits for the centre's review. */
  | "pending"
  | "none";

export interface SpecialistState {
  /** Working with the centre (and their account on). */
  active: boolean;
  acceptingNewClients: boolean;
  profile: SpecialistProfileState;
}

export interface SpecialistRow {
  id: string;
  name: string;
  title: string | null;
  initials: string;
  avatarUrl: string | null;
  /** Their colour (null: the automatic one, from the id). */
  color: string | null;
  /** Their page. */
  href: string;
  /** Offers set up. */
  services: number;
  /** `od 03.2026` */
  since: string | null;
  /** Their profile's address on the site. */
  slug: string;
  state: SpecialistState;
  /** The week shown: its seven days and its sum. */
  days: WeekDay[];
  occupancy: Occupancy;
  /** What they are doing now (this week only). */
  now: NowStatus | null;
  /** The next visits, the soonest first. */
  upcoming: UpcomingVisit[];
}

/** A service they offer, at their price. */
export interface SpecialistOffer {
  id: string;
  serviceName: string;
  category: string | null;
  /** `240 zł` */
  price: string;
  /** `50 min` */
  duration: string;
  inPerson: boolean;
  online: boolean;
  active: boolean;
  acceptingNewClients: boolean;
}

/** Turns an offer on or off, or its new clients; refuses with a message. */
export type OfferStateAction = (input: {
  offerId: string;
  active: boolean;
  acceptingNewClients: boolean;
}) => Promise<{ ok: true } | { ok: false; message: string }>;
