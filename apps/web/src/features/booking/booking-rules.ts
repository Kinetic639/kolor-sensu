import type { BookingWindow } from "@repo/supabase";

// The booking's rules as the system applies them (Klient · 3, card 14):
// written from the centre's settings, the same ones the wizard, the
// e-mails and the database go by, so the Regulamin never says otherwise.
// The CMS's text around them is the centre's own.

export interface BookingRule {
  title: string;
  text: string;
}

export type BookingRulesSettings = Pick<
  BookingWindow,
  | "holdMinutes"
  | "paymentDueHours"
  | "cancellationWindowHours"
  | "rescheduleWindowHours"
  | "maxSelfReschedules"
>;

/** "1 raz", "2 razy". */
function times(count: number) {
  return `${count} ${count === 1 ? "raz" : "razy"}`;
}

export function bookingRules(settings: BookingRulesSettings): BookingRule[] {
  const {
    holdMinutes,
    paymentDueHours,
    cancellationWindowHours,
    rescheduleWindowHours,
    maxSelfReschedules,
  } = settings;
  return [
    {
      title: "Wybrany termin",
      text: `Wybrany termin czeka na Ciebie ${holdMinutes} min, na podanie danych i płatność; w tym czasie nikt inny go nie zarezerwuje. Jedna osoba (ten sam e-mail albo telefon) może mieć tylko jedną wizytę o tej samej porze.`,
    },
    {
      title: "Płatność",
      text: "Za wizytę płacisz online: kartą, BLIK-iem albo przelewem. Wizyta jest potwierdzona, gdy płatność dotrze.",
    },
    {
      title: "Płatność później",
      text: `Wizytę możesz zarezerwować i opłacić później z linku w e-mailu: rezerwację potwierdzasz z e-maila w ciągu 30 minut, a płacisz najpóźniej ${paymentDueHours} godz. przed wizytą, inaczej rezerwacja zostanie anulowana. Gdy do wizyty zostało mniej czasu albo masz już dwie nieopłacone rezerwacje, płacisz od razu.`,
    },
    {
      title: "Odwołanie wizyty",
      text: `Wizytę odwołasz przez link z e-maila z potwierdzeniem. Pełny zwrot opłaty dostaniesz, odwołując ją najpóźniej ${cancellationWindowHours} godz. przed jej początkiem; później opłata nie wraca.`,
    },
    {
      title: "Zmiana terminu",
      text: `Opłaconą wizytę przełożysz przez link z e-maila najpóźniej ${rescheduleWindowHours} godz. przed jej początkiem, najwyżej ${times(maxSelfReschedules)}.`,
    },
    {
      title: "Kod rabatowy",
      text: "Kod rabatowy wpisujesz na kroku danych, przed płatnością; cenę po zniżce widzisz, zanim zapłacisz.",
    },
    {
      title: "Wizyta w ciągu 14 dni",
      text: "Gdy wizyta wypada w ciągu 14 dni od rezerwacji, przy rezerwacji prosisz o jej wykonanie przed upływem 14 dni na odstąpienie od umowy; po odbyciu wizyty od umowy nie można już odstąpić.",
    },
    {
      title: "Wizyty dzieci i młodzieży",
      text: "Usługę dla dziecka lub nastolatka rezerwuje rodzic albo opiekun prawny i to on jest klientem; potwierdza to przy rezerwacji.",
    },
  ];
}
