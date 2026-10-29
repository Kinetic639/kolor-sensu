import type { Route } from "next";
import {
  bookingHref,
  loadBookingParams,
  type BookingParams,
} from "./search-params";

// The wizard remembers the visitor's last choices for a day (#164): the
// service, the specialist, the form, the place and the week, never a time
// or anything personal. The address stays the wizard's only state; the
// memory only fills an address in, when the visitor comes to the wizard
// from elsewhere (a link from a service's page, back from the home page),
// and "Zmień termin" goes back to the same choices. Inside the wizard
// (a choice cleared with "Zmień") it never puts anything back. The page
// shown writes the cookie (in the browser, so a link fetched ahead, which
// the visitor has not chosen, never does); the proxy reads it.

export { MEMORY_COOKIE } from "./wizard-memory-cookie";

const CHOICES = ["usluga", "forma", "lokalizacja", "specjalista"] as const;

type Remembered = Partial<
  Pick<BookingParams, (typeof CHOICES)[number] | "tydzien">
>;

const WIZARD_PATH = "/umow-wizyte";

/** The cookie's value for the wizard's choices, or null: nothing chosen. */
export function memoryValue(params: BookingParams): string | null {
  if (!CHOICES.some((key) => params[key])) return null;
  const kept = new URLSearchParams();
  for (const key of CHOICES) {
    const value = params[key];
    if (value) kept.set(key, value);
  }
  const week = params.tydzien ?? params.termin?.slice(0, 10) ?? null;
  if (week) kept.set("tydzien", week);
  return kept.toString();
}

/**
 * The wizard with these choices (no time), for the header's "Dokończ
 * rezerwację"; null when nothing is chosen.
 */
export function resumeValue(params: BookingParams): string | null {
  const value = memoryValue(params);
  return value ? `${WIZARD_PATH}?${value}` : null;
}

/** The remembered choices (only valid ones), from the cookie's value. */
export function readMemory(value: string | null | undefined): Remembered {
  if (!value) return {};
  let params: BookingParams;
  try {
    params = loadBookingParams(new URLSearchParams(value));
  } catch {
    return {};
  }
  const remembered: Remembered = {};
  for (const key of [...CHOICES, "tydzien"] as const) {
    const choice = params[key];
    if (choice) Object.assign(remembered, { [key]: choice });
  }
  return remembered;
}

export interface WizardRequest {
  searchParams: URLSearchParams;
  /** The cookie's value. */
  memory: string | null;
  /** The page the visitor came from. */
  referer: string | null;
  /** The site's own origin. */
  origin: string;
}

/** Whether the visitor came from the wizard itself (its first page). */
export function fromWizard({ referer, origin }: WizardRequest) {
  if (!referer) return false;
  try {
    const from = new URL(referer);
    return from.origin === origin && from.pathname === WIZARD_PATH;
  } catch {
    return false;
  }
}

/**
 * The wizard's address with the remembered choices filled in, or null when
 * it stays as it is. The address wins: the memory only adds what it lacks,
 * and only when every choice it has is the remembered one (a link to
 * another service starts afresh). A chosen time is left alone.
 */
export function rememberedHref(request: WizardRequest): Route | null {
  const memory = readMemory(request.memory);
  if (!CHOICES.some((key) => memory[key]) || fromWizard(request)) return null;
  const params = loadBookingParams(request.searchParams);
  if (params.termin) return null;
  const fits = CHOICES.every(
    (key) => !params[key] || params[key] === memory[key],
  );
  if (!fits) return null;
  const merged: Partial<BookingParams> = { ...params };
  let added = false;
  for (const key of [...CHOICES, "tydzien"] as const) {
    if (!params[key] && memory[key]) {
      Object.assign(merged, { [key]: memory[key] });
      added = true;
    }
  }
  if (!added) return null;
  const href = bookingHref(merged);
  return (params.uwaga ? `${href}&uwaga=${params.uwaga}` : href) as Route;
}
