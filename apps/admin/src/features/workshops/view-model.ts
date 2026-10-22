import type { WorkshopInput } from "@repo/contracts/workshops";
import { zonedInstant } from "@repo/scheduling";
import type {
  AdminWorkshopRecord,
  AdminWorkshopRow,
  WorkshopPayload,
} from "@repo/supabase/workshops-admin";

// Warsztaty in the portal (docs/product/workshops-plan.md, PR 2), apart
// from how they look: the list's segments and rows, and the form's
// workshop to and from the database (the date and hours in the centre's
// time zone). Pure, so it is tested without a database.

export const WORKSHOP_SEGMENTS = [
  "nadchodzace",
  "szkice",
  "minione",
  "odwolane",
  "wszystkie",
] as const;
export type WorkshopSegment = (typeof WORKSHOP_SEGMENTS)[number];

export const WORKSHOP_SEGMENT_LABELS: Record<WorkshopSegment, string> = {
  nadchodzace: "Nadchodzące",
  szkice: "Szkice",
  minione: "Minione",
  odwolane: "Odwołane",
  wszystkie: "Wszystkie",
};

export function readSegment(value: unknown): WorkshopSegment {
  return WORKSHOP_SEGMENTS.includes(value as WorkshopSegment)
    ? (value as WorkshopSegment)
    : "nadchodzace";
}

export function segmentOf(row: AdminWorkshopRow, now: Date): WorkshopSegment {
  if (row.status === "draft") return "szkice";
  if (row.status === "cancelled") return "odwolane";
  if (row.status === "completed" || new Date(row.endsAt) <= now)
    return "minione";
  return "nadchodzace";
}

export function segmentCounts(rows: readonly AdminWorkshopRow[], now: Date) {
  const counts = Object.fromEntries(
    WORKSHOP_SEGMENTS.map((segment) => [segment, 0]),
  ) as Record<WorkshopSegment, number>;
  for (const row of rows) counts[segmentOf(row, now)] += 1;
  counts.wszystkie = rows.length;
  return counts;
}

/** The segment's workshops: the coming ones soonest first, else latest first. */
export function workshopList(
  rows: readonly AdminWorkshopRow[],
  {
    segment,
    query,
    now,
  }: { segment: WorkshopSegment; query: string; now: Date },
) {
  const words = query.trim().toLocaleLowerCase("pl");
  return rows
    .filter((row) => segment === "wszystkie" || segmentOf(row, now) === segment)
    .filter(
      (row) =>
        !words ||
        [row.title, row.leaders ?? "", row.locationName ?? ""]
          .join(" ")
          .toLocaleLowerCase("pl")
          .includes(words),
    )
    .sort((a, b) =>
      segment === "nadchodzace" || segment === "szkice"
        ? a.startsAt.localeCompare(b.startsAt)
        : b.startsAt.localeCompare(a.startsAt),
    );
}

const day = (timeZone: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const clock = (timeZone: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });

/** `wt., 12 lis 2030, 17:00–19:00` */
export function whenLabel(startsAt: string, endsAt: string, timeZone: string) {
  return `${day(timeZone).format(new Date(startsAt))}, ${clock(timeZone).format(new Date(startsAt))}–${clock(timeZone).format(new Date(endsAt))}`;
}

/** `8 / 12` (the confirmed, of the seats) and what waits besides. */
export function seatsLabel(row: AdminWorkshopRow) {
  const waiting = [
    row.awaitingCount ? `${row.awaitingCount} czeka na wpłatę` : null,
    row.heldCount ? `${row.heldCount} w trakcie` : null,
    row.waitlistCount ? `${row.waitlistCount} na liście` : null,
  ].filter(Boolean);
  return {
    seats: `${row.confirmedCount} / ${row.capacity}`,
    waiting: waiting.join(", ") || null,
  };
}

/** The local day and `HH:MM` of an instant, in a time zone. */
function localParts(instant: string, timeZone: string) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(instant),
  );
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
  return { date, time };
}

/** The database's workshop as the form holds it. */
export function recordToInput(
  record: AdminWorkshopRecord,
  timeZone: string,
): WorkshopInput {
  const start = localParts(record.startsAt, timeZone);
  const end = localParts(record.endsAt, timeZone);
  const closesHoursBefore = record.registrationClosesAt
    ? Math.round(
        (new Date(record.startsAt).getTime() -
          new Date(record.registrationClosesAt).getTime()) /
          3_600_000,
      )
    : null;
  return {
    title: record.title,
    slug: record.slug,
    shortDescription: record.shortDescription ?? "",
    body: record.body,
    audience: record.audience ?? "",
    agenda: record.agenda ?? "",
    coverPath: record.coverPath,
    coverAlt: record.coverAlt ?? "",
    seoTitle: record.seoTitle ?? "",
    seoDescription: record.seoDescription ?? "",
    specialistId: record.specialistId,
    coLeaderIds: record.coLeaderIds,
    modality: record.modality,
    locationId: record.locationId,
    roomId: record.roomId,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    priceMinor: record.priceMinor,
    capacity: record.capacity,
    minParticipants: record.minParticipants,
    registrationEnabled: record.registrationEnabled,
    closesHoursBefore,
    meetingUrl: record.meetingUrl ?? "",
  };
}

/** The form's workshop as the database saves it. */
export function inputToPayload(
  input: WorkshopInput,
  timeZone: string,
): WorkshopPayload {
  const startsAt = zonedInstant(input.date, input.startTime, timeZone);
  const endsAt = zonedInstant(input.date, input.endTime, timeZone);
  const inPerson = input.modality === "in_person";
  return {
    slug: input.slug,
    title: input.title,
    short_description: input.shortDescription,
    body: (input.body ?? null) as WorkshopPayload["body"],
    audience: input.audience,
    agenda: input.agenda,
    cover_image_path: input.coverPath,
    cover_alt: input.coverAlt,
    seo_title: input.seoTitle,
    seo_description: input.seoDescription,
    specialist_id: input.specialistId,
    co_leader_ids: input.coLeaderIds.filter((id) => id !== input.specialistId),
    modality: input.modality,
    location_id: inPerson ? input.locationId : null,
    room_id: inPerson ? input.roomId : null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    price_minor: input.priceMinor,
    capacity: input.capacity,
    min_participants: input.minParticipants,
    registration_enabled: input.registrationEnabled,
    registration_closes_at:
      input.closesHoursBefore === null
        ? null
        : new Date(
            startsAt.getTime() - input.closesHoursBefore * 3_600_000,
          ).toISOString(),
    meeting_url: inPerson ? "" : input.meetingUrl,
  };
}
