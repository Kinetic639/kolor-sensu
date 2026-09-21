import { z } from "zod";
import { currencyCodeSchema } from "@repo/contracts/center";
import { priceMinorSchema } from "@repo/contracts/services";

export const workshopModalitySchema = z.enum(["in_person", "online"]);

/**
 * draft: Admin editing, never public.
 * published: public event, appears in the public upcoming list.
 * cancelled: cancelled; remains addressable at its detail URL, clearly
 *   labelled "Odwołany", excluded from the public upcoming list.
 * completed: took place; addressable, excluded from the public upcoming
 *   list.
 * Deliberately the only lifecycle flag on the domain -- see
 * docs/architecture/workshops-domain.md for why no separate
 * active/publiclyVisible booleans exist. Status transitions go through
 * publishWorkshop/cancelWorkshop/completeWorkshop, never a raw field edit.
 */
export const workshopStatusSchema = z.enum([
  "draft",
  "published",
  "cancelled",
  "completed",
]);

export const workshopSlugSchema = z
  .string()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL safe.");

export const workshopCapacitySchema = z.number().int().min(1).max(500);

const workshopBaseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: workshopSlugSchema,
  shortDescription: z.string().trim().max(500).nullable().default(null),
  // Plain text for this phase -- the shared Rich Text Platform is still an
  // in-progress, uncommitted, currently-broken build elsewhere in this
  // repo. See docs/architecture/workshops-domain.md.
  longDescription: z.string().trim().max(10_000).nullable().default(null),
  specialistId: z.uuid(),
  locationId: z.uuid().nullable().default(null),
  roomId: z.uuid().nullable().default(null),
  modality: workshopModalitySchema.default("in_person"),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  priceMinor: priceMinorSchema,
  currencyCode: currencyCodeSchema.default("PLN"),
  capacity: workshopCapacitySchema,
  registrationEnabled: z.boolean().default(false),
  coverImagePath: z.string().trim().max(2048).nullable().default(null),
});

export const workshopCreateSchema = workshopBaseSchema
  .refine((value) => new Date(value.startsAt) < new Date(value.endsAt), {
    message: "Start must be before end.",
    path: ["endsAt"],
  })
  .refine(
    (value) =>
      value.modality === "online"
        ? value.locationId === null && value.roomId === null
        : value.locationId !== null,
    {
      message:
        "In-person workshops require a location; online workshops must not have a location or room.",
      path: ["locationId"],
    },
  );

// Partial update: only the base object's shape, no cross-field refine.
// Mirrors the existing Room/Service update-schema precedent in this
// codebase -- the DB's CHECK/FK constraints remain the backstop for the
// modality/time invariants on partial patches.
export const workshopUpdateSchema = workshopBaseSchema.partial();

export type WorkshopModality = z.infer<typeof workshopModalitySchema>;
export type WorkshopStatus = z.infer<typeof workshopStatusSchema>;
export type WorkshopCreate = z.infer<typeof workshopBaseSchema>;
export type WorkshopUpdate = z.infer<typeof workshopUpdateSchema>;

export interface Workshop {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  specialistId: string;
  locationId: string | null;
  roomId: string | null;
  modality: WorkshopModality;
  startsAt: string;
  endsAt: string;
  priceMinor: number;
  currencyCode: string;
  capacity: number;
  registrationEnabled: boolean;
  status: WorkshopStatus;
  coverImagePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicWorkshopSpecialist {
  publicSlug: string;
  displayName: string;
  professionalTitle: string | null;
}

export interface PublicWorkshopLocation {
  name: string;
  slug: string;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
}

export interface PublicWorkshopRoom {
  displayName: string;
  slug: string;
}

/**
 * The public-safe projection of a workshop. `specialist`/`location` are
 * null not because the data is missing, but because the referenced
 * specialist/location isn't *currently* publicly visible -- the workshop
 * still renders, just without that cross-link (never leaking that a
 * private specialist/location exists).
 */
export interface PublicWorkshopSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  startsAt: string;
  endsAt: string;
  modality: WorkshopModality;
  priceMinor: number;
  currencyCode: string;
  capacity: number;
  registrationEnabled: boolean;
  status: WorkshopStatus;
  coverImagePath: string | null;
  specialist: PublicWorkshopSpecialist | null;
  location: PublicWorkshopLocation | null;
}

export interface PublicWorkshopDetail extends PublicWorkshopSummary {
  longDescription: string | null;
  /** null for online workshops, no assigned room, or a room without a public profile. */
  room: PublicWorkshopRoom | null;
}

export function workshopDurationMinutes(
  startsAt: string,
  endsAt: string,
): number {
  return Math.round(
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60_000,
  );
}

/** A workshop belongs on the public "upcoming" list only while published and in the future. */
export function isWorkshopUpcoming(
  workshop: Pick<PublicWorkshopSummary, "status" | "startsAt">,
  now: Date = new Date(),
): boolean {
  return workshop.status === "published" && new Date(workshop.startsAt) > now;
}

/**
 * Center-wide default timezone (matches center_settings.timezone's
 * default). This is a single-center product (see ADR 0001) -- a future
 * multi-center product would thread the real center timezone through
 * instead of this constant.
 */
export const DEFAULT_CENTER_TIMEZONE = "Europe/Warsaw";

export function formatWorkshopDate(
  startsAt: string,
  timeZone: string = DEFAULT_CENTER_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(new Date(startsAt));
}

export function formatWorkshopTimeRange(
  startsAt: string,
  endsAt: string,
  timeZone: string = DEFAULT_CENTER_TIMEZONE,
): string {
  const formatter = new Intl.DateTimeFormat("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`;
}

function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60_000;
}

/**
 * Combines a plain `date` ("2026-10-15") and `time` ("17:00") entered in
 * the center's timezone into an absolute ISO instant. Used by the Admin
 * form, which asks for date/start time/end time as separate wall-clock
 * fields rather than an ISO string. Resolves the correct UTC offset for
 * that specific date (so DST transitions are handled), not a fixed
 * constant.
 */
export function combineDateTimeToIso(
  date: string,
  time: string,
  timeZone: string = DEFAULT_CENTER_TIMEZONE,
): string {
  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) {
    throw new Error("date must be yyyy-MM-dd and time must be HH:mm.");
  }
  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
  );
  const offsetMinutes = getTimezoneOffsetMinutes(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offsetMinutes * 60_000).toISOString();
}

/** The inverse of combineDateTimeToIso -- splits an ISO instant back into the date/time wall-clock fields the Admin form edits. */
export function splitIsoToDateTime(
  iso: string,
  timeZone: string = DEFAULT_CENTER_TIMEZONE,
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export const workshopStatusLabels: Record<WorkshopStatus, string> = {
  draft: "Szkic",
  published: "Opublikowany",
  cancelled: "Odwołany",
  completed: "Zakończony",
};

export const workshopModalityLabels: Record<WorkshopModality, string> = {
  in_person: "Stacjonarnie",
  online: "Online",
};
