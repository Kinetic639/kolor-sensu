import { z } from "zod";

// A workshop as the admin portal's form holds it (docs/product/
// workshops-plan.md, PR 2): its words, its date and hours in the centre's
// time, its place, its leaders, its price and seats. The database checks
// the same rules again (and the leaders' and room's other plans); this is
// what the form says in Polish before it goes.

export const WORKSHOP_LIMITS = {
  title: 200,
  shortDescription: 500,
  audience: 2000,
  agenda: 3000,
  coverAlt: 300,
  seoTitle: 70,
  seoDescription: 160,
  coLeaders: 5,
} as const;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const WORKSHOP_MODALITIES = ["in_person", "online"] as const;
export type WorkshopModalityInput = (typeof WORKSHOP_MODALITIES)[number];

export const workshopInputSchema = z
  .strictObject({
    title: z.string().trim().min(1, "Podaj tytuł.").max(WORKSHOP_LIMITS.title),
    slug: z
      .string()
      .trim()
      .regex(SLUG, "Adres: małe litery, cyfry i myślniki.")
      .min(3, "Adres: co najmniej 3 znaki.")
      .max(100),
    shortDescription: z.string().trim().max(WORKSHOP_LIMITS.shortDescription),
    /** The description, in the article editor's document (or none). */
    body: z.unknown().nullable(),
    audience: z.string().trim().max(WORKSHOP_LIMITS.audience),
    agenda: z.string().trim().max(WORKSHOP_LIMITS.agenda),
    coverPath: z.string().trim().min(1).max(2048).nullable(),
    coverAlt: z.string().trim().max(WORKSHOP_LIMITS.coverAlt),
    seoTitle: z.string().trim().max(WORKSHOP_LIMITS.seoTitle),
    seoDescription: z.string().trim().max(WORKSHOP_LIMITS.seoDescription),
    specialistId: z.uuid("Wybierz prowadzącego."),
    coLeaderIds: z.array(z.uuid()).max(WORKSHOP_LIMITS.coLeaders),
    modality: z.enum(WORKSHOP_MODALITIES),
    locationId: z.uuid().nullable(),
    roomId: z.uuid().nullable(),
    /** The centre's day, YYYY-MM-DD. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę."),
    startTime: z.string().regex(TIME, "Podaj godzinę początku."),
    endTime: z.string().regex(TIME, "Podaj godzinę końca."),
    priceMinor: z
      .number()
      .int()
      .min(0, "Cena nie może być ujemna.")
      .max(10_000_000, "Za wysoka cena."),
    capacity: z
      .number()
      .int("Podaj liczbę miejsc.")
      .min(1, "Co najmniej 1 miejsce.")
      .max(500, "Najwyżej 500 miejsc."),
    minParticipants: z.number().int().min(1).nullable(),
    registrationEnabled: z.boolean(),
    /** How many hours before the start registration ends (none: 24). */
    closesHoursBefore: z
      .number()
      .int()
      .min(0)
      .max(24 * 60)
      .nullable(),
    meetingUrl: z
      .string()
      .trim()
      .max(2048)
      .refine((url) => url === "" || /^https:\/\/\S+$/.test(url), {
        message: "Link do spotkania zaczyna się od https://.",
      }),
  })
  .refine((input) => input.endTime > input.startTime, {
    message: "Koniec musi być po początku.",
    path: ["endTime"],
  })
  .refine((input) => input.modality === "online" || input.locationId, {
    message: "Wybierz miejsce warsztatu.",
    path: ["locationId"],
  })
  .refine(
    (input) =>
      input.minParticipants === null || input.minParticipants <= input.capacity,
    {
      message: "Minimum nie może być większe niż liczba miejsc.",
      path: ["minParticipants"],
    },
  );

export type WorkshopInput = z.infer<typeof workshopInputSchema>;

/** The portal asks the site to cancel a workshop (with refunds). */
export const workshopCancelRequestSchema = z.strictObject({
  reason: z.string().trim().max(1000).nullable(),
});

export type WorkshopCancelRequest = z.infer<typeof workshopCancelRequestSchema>;

/** The portal adds a participant (a call, a transfer). */
export const workshopParticipantRequestSchema = z.strictObject({
  name: z.string().trim().min(1, "Podaj imię i nazwisko.").max(200),
  email: z.email("Podaj poprawny e-mail.").max(320),
  phone: z.string().trim().max(40).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  /** Paid to the centre directly: confirmed at once. */
  paidOutside: z.boolean(),
});

export type WorkshopParticipantRequest = z.infer<
  typeof workshopParticipantRequestSchema
>;

/** The portal cancels one participant, giving back what the admin chose. */
export const workshopParticipantCancelSchema = z.strictObject({
  refundMinor: z.number().int().min(0).max(10_000_000),
});

/** The admin writes to everyone signed up. */
export const workshopMessageRequestSchema = z.strictObject({
  subject: z.string().trim().min(1, "Wpisz temat.").max(200),
  body: z.string().trim().min(1, "Wpisz wiadomość.").max(5000),
});

export type WorkshopMessageRequest = z.infer<
  typeof workshopMessageRequestSchema
>;

/** What the database's refusals say to the admin. */
export const WORKSHOP_ADMIN_PROBLEMS: Record<string, string> = {
  slug_taken: "Ten adres ma już inny warsztat. Zmień adres.",
  specialist_busy:
    "Prowadzący ma w tym czasie wizytę. Przenieś ją albo wybierz inny termin.",
  specialist_away: "Prowadzący ma w tym czasie wolne albo inny warsztat.",
  room_busy: "Sala jest w tym czasie zajęta (wizyta albo inny warsztat).",
  one_day: "Warsztat w sali musi skończyć się tego samego dnia.",
  capacity_below_taken: "Zapisało się więcej osób, niż chcesz zostawić miejsc.",
  incomplete: "Uzupełnij krótki opis i ustaw termin w przyszłości.",
  not_draft: "Opublikować można tylko szkic.",
  not_published: "Ta zmiana dotyczy tylko opublikowanego warsztatu.",
  has_registrations:
    "Ktoś jest już zapisany: warsztat można tylko odwołać (ze zwrotem pieniędzy).",
  used_by_code: "Ten warsztat ma swój kod rabatowy: najpierw usuń kod.",
  not_deletable: "Usunąć można tylko szkic albo odwołany warsztat.",
  not_cancellable: "Tego warsztatu nie da się już odwołać.",
  workshop_cancelled: "Odwołany warsztat zostaje odwołany.",
  full: "Brak wolnych miejsc.",
  already_registered: "Ta osoba jest już zapisana na ten warsztat.",
  invalid_details: "Sprawdź imię, e-mail i telefon.",
  registration_closed: "Na ten warsztat nie można się już zapisać.",
  already_cancelled: "Ten zapis jest już anulowany.",
  refund_too_high: "Zwrot nie może być większy niż wpłata przez stronę.",
  not_started: "Obecność zaznacza się po rozpoczęciu warsztatu.",
  not_ended: "Zakończyć można warsztat, który już się odbył.",
  invalid_message: "Wpisz temat i treść wiadomości.",
  not_found: "Nie ma takiego warsztatu.",
};

/** An empty workshop for "Nowy warsztat". */
export function emptyWorkshopInput(specialistId: string): WorkshopInput {
  return {
    title: "",
    slug: "",
    shortDescription: "",
    body: null,
    audience: "",
    agenda: "",
    coverPath: null,
    coverAlt: "",
    seoTitle: "",
    seoDescription: "",
    specialistId,
    coLeaderIds: [],
    modality: "in_person",
    locationId: null,
    roomId: null,
    date: "",
    startTime: "17:00",
    endTime: "19:00",
    priceMinor: 0,
    capacity: 12,
    minParticipants: null,
    registrationEnabled: true,
    closesHoursBefore: null,
    meetingUrl: "",
  };
}
