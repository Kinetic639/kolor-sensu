import type { Route } from "next";

// The sign-up's addresses, and what the workshop's page says when a step
// sends the guest back (`?zapis=…`, at the sign-up box).

export const seatDetailsPath = (slug: string) =>
  `/warsztaty/${slug}/zapis` as Route;

export const seatPaymentPath = (slug: string) =>
  `/warsztaty/${slug}/platnosc` as Route;

export const SEAT_NOTICES = {
  "brak-miejsc":
    "Ktoś właśnie zajął ostatnie miejsce. Możesz zapisać się na listę rezerwową.",
  zamkniete: "Zapisy na ten warsztat są zamknięte.",
  "za-duzo-prob": "Za dużo prób naraz. Spróbuj ponownie za kilkanaście minut.",
  weryfikacja:
    "Nie udało się potwierdzić, że zapisuje się człowiek. Spróbuj ponownie.",
  wygaslo:
    "Czas na dokończenie zapisu minął i miejsce wróciło do puli. Zapisz się ponownie.",
} as const;

export type SeatNotice = keyof typeof SEAT_NOTICES;

export function seatNoticeHref(slug: string, notice: SeatNotice) {
  return `/warsztaty/${slug}?zapis=${notice}#zapis` as Route;
}

export function readSeatNotice(value: unknown): string | null {
  return typeof value === "string" && value in SEAT_NOTICES
    ? SEAT_NOTICES[value as SeatNotice]
    : null;
}
