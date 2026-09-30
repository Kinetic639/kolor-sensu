// A visit as a calendar file (RFC 5545), attached to the confirmation
// e-mail and offered on the visit's page: CRLF line ends, UTC times,
// escaped text, lines folded at 75 bytes without splitting a character.

export interface IcsEvent {
  uid: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
  /** Bumped on every change, so calendars update the same event. */
  sequence?: number;
  cancelled?: boolean;
  now?: Date;
}

/** `20301002T090000Z` */
function utc(instant: string | Date) {
  return (
    new Date(instant).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
  );
}

function escapeText(text: string) {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r?\n/g, "\\n");
}

const encoder = new TextEncoder();

/** Folds a content line: at most 75 bytes, continuation lines start with a space. */
function fold(line: string) {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function visitIcs(event: IcsEvent) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kolor Sensu//Rezerwacje//PL",
    "CALSCALE:GREGORIAN",
    event.cancelled ? "METHOD:CANCEL" : "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    `DTSTAMP:${utc(event.now ?? new Date())}`,
    `DTSTART:${utc(event.startsAt)}`,
    `DTEND:${utc(event.endsAt)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : null,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    event.cancelled ? "STATUS:CANCELLED" : "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => line !== null);
  return lines.map(fold).join("\r\n") + "\r\n";
}
