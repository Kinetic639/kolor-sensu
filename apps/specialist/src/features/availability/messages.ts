import { formatDate, formatWeekday } from "@repo/scheduling";
import {
  AvailabilityError,
  type AvailabilityErrorReason,
} from "@repo/supabase";

const MESSAGES: Record<AvailabilityErrorReason, string> = {
  overlap: "Te godziny nakładają się na inne Twoje godziny dostępności.",
  room_taken:
    "Ten gabinet jest w tym czasie zajęty przez innego specjalistę. Wybierz inny gabinet albo inne godziny.",
  room_closed:
    "Gabinet jest wtedy zamknięty. Wybierz godziny w jego godzinach otwarcia albo inny gabinet.",
  room_unavailable: "Ten gabinet nie jest już dostępny. Wybierz inny.",
  time_off_overlap: "Ta nieobecność nakłada się na inną, już zapisaną.",
  not_found: "Nie znaleziono tych godzin. Odśwież stronę.",
  forbidden: "Brak uprawnień do zmiany tego grafiku.",
};

/** What to tell the specialist when a change is refused. */
export function availabilityErrorMessage(error: unknown) {
  if (error instanceof AvailabilityError) {
    const { conflict } = error;
    if (error.reason === "room_taken" && conflict) {
      return `Gabinet jest już zajęty: ${conflict.specialistName}, ${formatDate(conflict.date)} (${formatWeekday(conflict.date)}), ${conflict.startsAt}–${conflict.endsAt}. Wybierz inny gabinet albo inne godziny, lub umów się z tą osobą na zamianę.`;
    }
    return MESSAGES[error.reason];
  }
  if (error instanceof Error && error.name === "ZodError") {
    return "Sprawdź poprawność danych.";
  }
  return "Nie udało się zapisać. Spróbuj ponownie.";
}

const STALE: AvailabilityErrorReason[] = [
  "room_taken",
  "overlap",
  "not_found",
  "room_unavailable",
];

/**
 * A refusal because the page shows old data: someone took the room, the
 * window changed in another tab, a room was switched off. The calendar
 * should reload so it shows why.
 */
export function isStaleRefusal(error: unknown) {
  return error instanceof AvailabilityError && STALE.includes(error.reason);
}
