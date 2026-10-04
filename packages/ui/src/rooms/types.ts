import type {
  NowStatus,
  Occupancy,
  RoomDay,
  RoomToday,
  RoomUser,
} from "@repo/scheduling";

// A room as the rooms' roster shows it.

export interface RoomRow {
  id: string;
  name: string;
  /** Its colour (null: the automatic one, from the id). */
  color: string | null;
  /** Its page. */
  href: string;
  location: string;
  capacity: number;
  sortOrder: number;
  active: boolean;
  /** Shown on the site (active, public, its profile published). */
  onSite: boolean;
  /** `Pn–Pt 08:00–20:00`; null: no opening hours. */
  hoursSummary: string | null;
  /** Each weekday's hours (null: closed), Monday first. */
  openingHours: { weekday: string; hours: string | null }[];
  /** The exceptions to come. */
  exceptions: { key: string; date: string; text: string }[];
  /** The week shown. */
  days: RoomDay[];
  occupancy: Occupancy;
  /** Today, when the week shown is this one. */
  today: RoomToday | null;
  now: NowStatus | null;
  users: RoomUser[];
}
