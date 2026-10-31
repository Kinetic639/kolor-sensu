import {
  addDays,
  formatDate,
  formatDateRange,
  formatDayMonth,
  formatWeekday,
  mondayOf,
  type FreeSlot,
} from "@repo/scheduling";
import type { BookableOffer } from "@repo/supabase";
import type {
  BookingStep as StepperStep,
  SlotPickerProps,
} from "@repo/ui/booking";
import { formatDuration, formatPrice } from "@/lib/format";
import {
  bookingHref,
  changeBookingHref,
  selectBookingHref,
  type BookingMode,
  type BookingParams,
} from "./search-params";
import type { BookingSelection } from "./selection";

// What the booking page shows at each step (docs/product/booking-plan.md,
// R4): the stepper, the summary and the step's choices, all as links built
// from the address. Pure, so every step is tested without a database.

export interface WizardInput {
  params: BookingParams;
  selection: BookingSelection;
  /** Every bookable offer (for names and photos). */
  offers: BookableOffer[];
  /** Specialists' photo URLs by their public slug. */
  photos: Map<string, string>;
  /** Today where the centre is (`2030-01-09`). */
  today: string;
  horizonDays: number;
  /** The shown week's free times (the time step only). */
  slots: FreeSlot[];
  /**
   * With an empty week: the soonest free time within the horizon, or null
   * for none (#203); undefined when not looked for.
   */
  nextFree?: FreeSlot | null;
}

export interface WizardCard {
  key: string;
  href: string;
  title: string;
  subtitle?: string;
  description?: string;
  photoUrl?: string;
  facts: string[];
  tags: string[];
  selected: boolean;
}

export interface WizardSummaryRow {
  key: "usluga" | "forma" | "specjalista" | "termin";
  label: string;
  value?: string;
  detail?: string;
  placeholder: string;
  changeHref?: string;
}

export type WizardPanel =
  | { kind: "choices"; title: string; lead: string; cards: WizardCard[] }
  | {
      kind: "slots";
      title: string;
      lead: string;
      picker: SlotPickerProps;
      /** The chosen free time, to hold: its instant and its label. */
      chosen: { startsAt: string; label: string } | null;
    };

export interface WizardView {
  stepIndex: number;
  /** Why an earlier choice was dropped, e.g. a form the specialist lacks. */
  notice?: string;
  steps: StepperStep[];
  summary: WizardSummaryRow[];
  panel: WizardPanel;
}

const MODE_LABELS: Record<BookingMode, string> = {
  stacjonarnie: "Stacjonarnie",
  online: "Online",
};

const WEEKDAY_SHORT = ["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob.", "Niedz."];

/** "od 200 zł" for several prices, "250 zł" for one. */
function priceLabel(offers: BookableOffer[]) {
  const prices = offers.map((offer) => offer.priceMinor);
  const lowest = offers.find(
    (offer) => offer.priceMinor === Math.min(...prices),
  )!;
  return prices.every((price) => price === lowest.priceMinor)
    ? formatPrice(lowest)
    : `od ${formatPrice(lowest)}`;
}

function modeTags(offers: BookableOffer[]) {
  return [
    offers.some((offer) => offer.supportsInPerson) ? "Stacjonarnie" : null,
    offers.some((offer) => offer.supportsOnline) ? "Online" : null,
  ].filter((tag): tag is string => tag !== null);
}

/** The week to show: chosen, or the chosen time's, or this one; never past. */
export function bookingWeek(params: BookingParams, today: string) {
  const current = mondayOf(today);
  const asked = params.tydzien ?? params.termin?.slice(0, 10) ?? today;
  const week = mondayOf(asked);
  return week < current ? current : week;
}

/** `czwartek, 10 stycznia 2030, godz. 13:00` */
function slotLabel(slot: Pick<FreeSlot, "date" | "localTime">) {
  return `${formatWeekday(slot.date)}, ${formatDate(slot.date)}, godz. ${slot.localTime}`;
}

function servicesPanel({
  params,
  selection,
  offers,
}: WizardInput): WizardPanel {
  return {
    kind: "choices",
    title: "Wybierz usługę",
    lead: "Dopasuj rodzaj spotkania do swoich potrzeb.",
    cards: selection.services.map((service) => {
      const ofService = offers.filter(
        (offer) =>
          offer.serviceSlug === service.slug &&
          (!selection.specialist ||
            offer.specialistPublicSlug === selection.specialist),
      );
      return {
        key: service.slug,
        href: selectBookingHref(params, "usluga", service.slug),
        title: service.name,
        description: service.shortDescription ?? undefined,
        facts: [
          formatDuration(
            ofService[0]?.effectiveDurationMinutes ??
              service.defaultDurationMinutes,
          ),
          priceLabel(ofService),
        ],
        tags: modeTags(ofService),
        selected: params.usluga === service.slug,
      };
    }),
  };
}

function modesPanel({ params, selection }: WizardInput): WizardPanel {
  if (selection.step === "lokalizacja") {
    return {
      kind: "choices",
      title: "Wybierz miejsce",
      lead: "Gdzie chcesz się spotkać?",
      cards: selection.locations.map((location) => ({
        key: location.slug,
        href: selectBookingHref(params, "lokalizacja", location.slug),
        title: location.name,
        description:
          [location.addressLine1, location.city].filter(Boolean).join(", ") ||
          undefined,
        facts: [],
        tags: [],
        selected: selection.location?.slug === location.slug,
      })),
    };
  }
  return {
    kind: "choices",
    title: "Wybierz formę spotkania",
    lead: "Spotkaj się z nami w gabinecie albo online.",
    cards: selection.modes.map((mode) => ({
      key: mode,
      href: selectBookingHref(params, "forma", mode),
      title: MODE_LABELS[mode],
      description:
        mode === "stacjonarnie"
          ? "W gabinecie, w jednej z naszych lokalizacji."
          : "Spotkanie przez internet, z dowolnego miejsca.",
      facts: [],
      tags: [],
      selected: selection.mode === mode,
    })),
  };
}

function specialistsPanel({
  params,
  selection,
  offers,
  photos,
}: WizardInput): WizardPanel {
  return {
    kind: "choices",
    title: "Wybierz specjalistę",
    lead: "Osoby prowadzące wybraną usługę w tej formie.",
    cards: selection.offers.map((choice) => {
      const offer = offers.find(
        (one) =>
          one.serviceSlug === choice.serviceSlug &&
          one.specialistPublicSlug === choice.specialistPublicSlug,
      );
      return {
        key: choice.specialistPublicSlug,
        href: selectBookingHref(
          params,
          "specjalista",
          choice.specialistPublicSlug,
        ),
        title: offer?.specialistName ?? choice.specialistPublicSlug,
        subtitle: choice.specialistProfessionalTitle ?? undefined,
        photoUrl: photos.get(choice.specialistPublicSlug),
        facts: [
          formatPrice(choice),
          formatDuration(choice.effectiveDurationMinutes),
        ],
        tags: [],
        selected: selection.specialist === choice.specialistPublicSlug,
      };
    }),
  };
}

/** A week's days with their free times, each a link choosing it. */
export function weekOfSlots(
  week: string,
  slots: FreeSlot[],
  hrefFor: (value: string) => string,
  chosen: string | null,
): SlotPickerProps["days"] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index);
    return {
      date,
      weekday: WEEKDAY_SHORT[index]!,
      label: formatDayMonth(date),
      fullLabel: `${formatWeekday(date)}, ${formatDayMonth(date)}`,
      slots: slots
        .filter((slot) => slot.date === date)
        .map((slot) => {
          const value = `${slot.date}T${slot.localTime}`;
          return {
            time: slot.localTime,
            href: hrefFor(value),
            selected: chosen === value,
          };
        }),
    };
  });
}

/** Kontakt, its message naming the visit sought (#203). */
function contactHref(input: WizardInput) {
  const { params, selection, offers } = input;
  const specialist = offers.find(
    (offer) => offer.specialistPublicSlug === params.specjalista,
  )?.specialistName;
  const parts = [
    selection.service?.name,
    specialist,
    params.forma === "online" ? "online" : "w gabinecie",
  ].filter(Boolean);
  const message = `Dzień dobry, szukam terminu: ${parts.join(", ")}.`;
  return `/kontakt?wiadomosc=${encodeURIComponent(message)}#formularz`;
}

function nothingFree(input: WizardInput) {
  const { params, slots, nextFree, horizonDays } = input;
  if (slots.length > 0 || nextFree === undefined) return undefined;
  if (nextFree === null) {
    return {
      kind: "none" as const,
      days: horizonDays,
      contactHref: contactHref(input),
    };
  }
  return {
    kind: "later" as const,
    label: `${formatWeekday(nextFree.date)}, ${formatDayMonth(nextFree.date)}`,
    href: bookingHref({
      ...params,
      tydzien: mondayOf(nextFree.date),
      termin: null,
    }),
  };
}

function slotsPanel(input: WizardInput, chosen: FreeSlot | null): WizardPanel {
  const { params, today, horizonDays, slots } = input;
  const week = bookingWeek(params, today);
  const days = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const lastDay = addDays(today, horizonDays);
  const keep = { ...params, tydzien: week };

  return {
    kind: "slots",
    title: chosen
      ? params.dalej === "auto" && !params.uwaga
        ? "Przechodzimy do Twoich danych"
        : "Termin wybrany"
      : "Wybierz termin",
    lead: chosen
      ? "Sprawdź podsumowanie wizyty i przejdź dalej do swoich danych."
      : "Poniżej znajdziesz wolne terminy u wybranego specjalisty. Godziny podajemy w czasie polskim.",
    chosen: chosen
      ? { startsAt: chosen.start.toISOString(), label: slotLabel(chosen) }
      : null,
    picker: {
      weekLabel: formatDateRange(week, days[6]!),
      previousHref:
        week > mondayOf(today)
          ? bookingHref({ ...params, tydzien: addDays(week, -7), termin: null })
          : null,
      nextHref:
        addDays(week, 7) <= lastDay
          ? bookingHref({ ...params, tydzien: addDays(week, 7), termin: null })
          : null,
      days: weekOfSlots(
        week,
        slots,
        (value) => selectBookingHref(keep, "termin", value),
        params.termin,
      ),
      nothingFree: nothingFree(input),
    },
  };
}

export function buildWizardView(input: WizardInput): WizardView {
  const { params, selection, offers } = input;
  const step = selection.step;
  const stepIndex =
    step === "usluga"
      ? 0
      : step === "forma" || step === "lokalizacja"
        ? 1
        : step === "specjalista"
          ? 2
          : 3;

  const chosenSlot =
    step === "termin"
      ? (input.slots.find(
          (slot) => `${slot.date}T${slot.localTime}` === params.termin,
        ) ?? null)
      : null;
  const chosenOffer = offers.find(
    (one) =>
      one.serviceSlug === selection.service?.slug &&
      one.specialistPublicSlug === selection.specialist,
  );
  const pendingTime =
    step !== "termin" && params.termin
      ? slotLabel({
          date: params.termin.slice(0, 10),
          localTime: params.termin.slice(11),
        })
      : undefined;

  const formValue = selection.mode
    ? [
        MODE_LABELS[selection.mode],
        selection.mode === "stacjonarnie" ? selection.location?.name : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  const summary: WizardSummaryRow[] = [
    {
      key: "usluga",
      label: "Usługa",
      value: selection.service?.name,
      // The chosen specialist's price and length (card 4).
      detail: chosenOffer
        ? `${formatPrice(chosenOffer)} · ${formatDuration(chosenOffer.effectiveDurationMinutes)}`
        : undefined,
      placeholder: "Wybierz usługę",
      changeHref: changeBookingHref(params, "usluga"),
    },
    {
      key: "forma",
      label: "Forma",
      value: formValue,
      placeholder: "Wybierz formę spotkania",
      changeHref: changeBookingHref(params, "forma"),
    },
    {
      key: "specjalista",
      label: "Specjalista",
      value: chosenOffer?.specialistName,
      detail: chosenOffer?.specialistProfessionalTitle ?? undefined,
      placeholder: "Wybierz specjalistę",
      changeHref: changeBookingHref(params, "specjalista"),
    },
    {
      key: "termin",
      label: "Termin",
      value: chosenSlot ? slotLabel(chosenSlot) : pendingTime,
      detail: pendingTime
        ? "Dostępność potwierdzimy po uzupełnieniu wyborów."
        : undefined,
      placeholder: "Wybierz termin",
      changeHref: changeBookingHref(params, "termin"),
    },
  ];

  const labels = [
    "Usługa",
    "Forma",
    "Specjalista",
    "Termin",
    "Dane",
    "Potwierdzenie",
  ];
  const back = [
    changeBookingHref(params, "usluga"),
    changeBookingHref(params, "forma"),
    changeBookingHref(params, "specjalista"),
    changeBookingHref(params, "termin"),
  ];
  const steps = labels.map((label, index) => ({
    key: label,
    label,
    href: back[index],
    completed:
      [
        !!selection.service,
        !!selection.mode &&
          (selection.mode === "online" || !!selection.location),
        !!selection.specialist,
        step === "termin" ? !!chosenSlot : !!params.termin,
      ][index] ?? false,
  }));

  const panel =
    step === "usluga"
      ? servicesPanel(input)
      : step === "forma" || step === "lokalizacja"
        ? modesPanel(input)
        : step === "specjalista"
          ? specialistsPanel(input)
          : slotsPanel(input, chosenSlot);

  return {
    stepIndex,
    steps,
    summary,
    panel,
    notice:
      droppedNotice(input) ??
      (step === "termin" && params.termin && !chosenSlot
        ? "Wybrany termin nie jest już dostępny dla tych ustawień wizyty. Wybierz inną godzinę lub zmień wcześniejsze wybory."
        : undefined),
  };
}

const MODE_PHRASES: Record<BookingMode, string> = {
  stacjonarnie: "stacjonarnie, w gabinecie",
  online: "online",
};

/** Why the form asked for is gone, and what to choose (card 13). */
function droppedNotice({ selection, offers }: WizardInput) {
  const { droppedMode, service, specialist } = selection;
  if (!droppedMode || !service) return undefined;
  const name = offers.find(
    (offer) => offer.specialistPublicSlug === specialist,
  )?.specialistName;
  const why = name
    ? `${name} nie prowadzi usługi „${service.name}” ${MODE_PHRASES[droppedMode]}.`
    : `Usługa „${service.name}” nie odbywa się ${MODE_PHRASES[droppedMode]}.`;
  return `${why} Wybierz, proszę, formę spotkania ponownie.`;
}
