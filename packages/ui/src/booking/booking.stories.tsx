import type { Decorator, Meta, StoryObj } from "@storybook/react";
import {
  CalendarDays,
  FileText,
  Heart,
  House,
  Leaf,
  UserRound,
} from "lucide-react";
import { expect } from "storybook/test";
import { PrimaryButton } from "../public-site/actions";
import {
  BookingChoiceCard,
  BookingCrisisNote,
  BookingField,
  BookingStepper,
  ConsentCheckbox,
  BookingSummary,
  HoldNotice,
  SlotPicker,
  type SlotPickerDay,
} from "./index";

// The booking wizard, R3 of docs/product/booking-plan.md. References:
// docs/design/references/booking/ (steps 1, 3 and 4).

const paper: Decorator = (Story) => (
  <div className="bg-bg px-gutter font-body text-ink min-h-screen py-10">
    <div className="mx-auto max-w-[75rem]">
      <Story />
    </div>
  </div>
);

const meta = {
  title: "Public site/Booking",
  parameters: { layout: "fullscreen", controls: { disable: true } },
  decorators: [paper],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const steps = [
  { key: "usluga", label: "Usługa", href: "#usluga" },
  { key: "forma", label: "Forma", href: "#forma" },
  { key: "specjalista", label: "Specjalista", href: "#specjalista" },
  { key: "termin", label: "Termin" },
  { key: "dane", label: "Dane" },
  { key: "potwierdzenie", label: "Potwierdzenie" },
];

export const PreselectedSpecialist: Story = {
  render: () => (
    <BookingStepper
      current={1}
      steps={steps.map((step, index) => ({
        ...step,
        completed: [0, 2, 3].includes(index),
        href: step.href ?? (index === 3 ? "#termin" : undefined),
      }))}
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Krok 3: Specjalista (ukończony)" }),
    ).toBeVisible();
  },
};

export const Stepper: Story = {
  render: () => (
    <div className="grid gap-10">
      <BookingStepper
        current={0}
        label="Kroki rezerwacji: początek"
        steps={steps}
      />
      <BookingStepper
        current={3}
        label="Kroki rezerwacji: termin"
        steps={steps}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Krok 3: Specjalista (ukończony)" }),
    ).toBeVisible();
  },
};

const services = [
  {
    slug: "konsultacja",
    title: "Konsultacja psychologiczna",
    description:
      "Pierwsze spotkanie, podczas którego omawiamy Twoje potrzeby i wspólnie ustalamy kierunki wsparcia.",
    icon: <UserRound />,
  },
  {
    slug: "psychoterapia",
    title: "Psychoterapia indywidualna",
    description:
      "Regularne spotkania wspierające w budowaniu dobrostanu i lepszym rozumieniu siebie.",
    icon: <Leaf />,
  },
  {
    slug: "terapia-par",
    title: "Terapia par",
    description:
      "Spotkania dla par, które chcą poprawić komunikację lub przejść przez trudny okres.",
    icon: <Heart />,
  },
];

export const ServiceChoices: Story = {
  render: () => (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service, index) => (
        <BookingChoiceCard
          description={service.description}
          facts={["50 minut", "od 250 zł"]}
          href={`?usluga=${service.slug}`}
          key={service.slug}
          media={service.icon}
          selected={index === 0}
          tags={["Stacjonarnie", "Online"]}
          title={service.title}
        />
      ))}
    </ul>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Konsultacja psychologiczna" }),
    ).toHaveAttribute("aria-current", "true");
  },
};

export const SpecialistChoices: Story = {
  render: () => (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[
        ["Anna Kłobuchowska", "Psycholożka, psychoterapeutka", "250 zł"],
        ["Michał Stępień", "Psycholog, psychoterapeuta", "220 zł"],
      ].map(([name, title, price], index) => (
        <BookingChoiceCard
          facts={[`${price} za wizytę`, "Stacjonarnie · Gabinet Zielony"]}
          href={`?specjalista=${index}`}
          key={name}
          media={<UserRound />}
          selected={index === 1}
          subtitle={title}
          tags={["lęk", "kryzysy życiowe", "relacje"]}
          title={name!}
        />
      ))}
    </ul>
  ),
};

function week(selected?: string): SlotPickerDay[] {
  const hours: Record<string, string[]> = {
    "2025-04-14": ["10:00", "13:00", "14:00"],
    "2025-04-15": ["09:00", "10:00", "15:00", "16:00"],
    "2025-04-16": ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00"],
    "2025-04-17": ["10:00", "11:00", "14:00", "16:00"],
    "2025-04-18": ["11:00", "13:00"],
  };
  const names = [
    ["Pon.", "poniedziałek"],
    ["Wt.", "wtorek"],
    ["Śr.", "środa"],
    ["Czw.", "czwartek"],
    ["Pt.", "piątek"],
  ];
  return Object.entries(hours).map(([date, times], index) => {
    const label = `${Number(date.slice(8))} kwietnia`;
    return {
      date,
      weekday: names[index]![0]!,
      label,
      fullLabel: `${names[index]![1]}, ${label}`,
      slots: times.map((time) => ({
        time,
        href: `?termin=${date}T${time}`,
        selected: `${date}T${time}` === selected,
      })),
    };
  });
}

export const Slots: Story = {
  render: () => (
    <SlotPicker
      days={week()}
      nextHref="?tydzien=2025-04-21"
      previousHref={null}
      weekLabel="14–20 kwietnia 2025"
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getAllByRole("link", { name: "środa, 16 kwietnia, 10:00" })[0],
    ).toHaveAttribute("href", "?termin=2025-04-16T10:00");
  },
};

export const SlotsOnAPhone: Story = {
  ...Slots,
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const NoFreeTimesThisWeek: Story = {
  render: () => (
    <SlotPicker
      days={week().map((day) => ({ ...day, slots: [] }))}
      nextHref="?tydzien=2025-04-28"
      previousHref="?tydzien=2025-04-14"
      weekLabel="21–27 kwietnia 2025"
    />
  ),
};

/** This week has nothing, a later one has (#203). */
export const NextFreeTimeLater: Story = {
  render: () => (
    <SlotPicker
      days={week().map((day) => ({ ...day, slots: [] }))}
      nextHref="?tydzien=2025-04-28"
      nothingFree={{
        kind: "later",
        label: "czwartek, 8 maja",
        href: "?tydzien=2025-05-05",
      }}
      previousHref="?tydzien=2025-04-14"
      weekLabel="21–27 kwietnia 2025"
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Pokaż ten tydzień" }),
    ).toHaveAttribute("href", "?tydzien=2025-05-05");
  },
};

/** Nothing free in the whole horizon: the way to Kontakt (#203). */
export const NothingFree: Story = {
  render: () => (
    <SlotPicker
      days={week().map((day) => ({ ...day, slots: [] }))}
      nextHref="?tydzien=2025-04-28"
      nothingFree={{
        kind: "none",
        days: 60,
        contactHref: "/kontakt?temat=Termin%3A%20Konsultacja",
      }}
      previousHref={null}
      weekLabel="21–27 kwietnia 2025"
    />
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: "Skontaktuj się z nami" }),
    ).toBeVisible();
  },
};

// Step 4 put together, as in the reference: the week, and the summary with
// the held time.
export const TimeStep: Story = {
  render: () => (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h1 className="font-display text-display text-ink">Umów spotkanie</h1>
        <BookingStepper
          className="w-full max-w-2xl"
          current={3}
          steps={steps}
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-card border-border/70 bg-surface shadow-card border p-5 sm:p-6">
          <h2 className="font-display text-h3 text-ink">Wybierz termin</h2>
          <p className="text-small text-text-muted mt-1 mb-5">
            Poniżej znajdziesz wolne terminy u wybranego specjalisty.
          </p>
          <SlotPicker
            days={week("2025-04-16T10:00")}
            nextHref="?tydzien=2025-04-21"
            previousHref={null}
            weekLabel="14–20 kwietnia 2025"
          />
        </section>
        <BookingSummary
          items={[
            {
              key: "usluga",
              icon: <FileText />,
              label: "Usługa",
              value: "Konsultacja psychologiczna",
              changeHref: "#usluga",
            },
            {
              key: "forma",
              icon: <House />,
              label: "Forma",
              value: "Stacjonarnie",
              changeHref: "#forma",
            },
            {
              key: "specjalista",
              icon: <UserRound />,
              label: "Specjalista",
              value: "Anna Kłobuchowska",
              detail: "Psycholożka, psychoterapeutka",
              changeHref: "#specjalista",
            },
            {
              key: "termin",
              icon: <CalendarDays />,
              label: "Termin",
              value: "Środa, 16 kwietnia 2025, godz. 10:00",
              changeHref: "#termin",
            },
          ]}
        >
          <HoldNotice until="10:42" />
          <PrimaryButton arrow className="w-full">
            Przejdź dalej
          </PrimaryButton>
        </BookingSummary>
      </div>
    </div>
  ),
};

// Step 5's fields, after a submit with a wrong e-mail and no consents.
export const DetailsWithErrors: Story = {
  render: () => (
    <form
      className="rounded-card bg-surface grid max-w-2xl gap-5 p-6"
      noValidate
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <BookingField
          autoComplete="given-name"
          defaultValue="Jan"
          label="Imię"
          name="firstName"
          required
        />
        <BookingField
          autoComplete="family-name"
          defaultValue="Kowalski"
          label="Nazwisko"
          name="lastName"
          required
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <BookingField
          autoComplete="tel"
          defaultValue="600 100 200"
          label="Telefon"
          name="phone"
          required
          type="tel"
        />
        <BookingField
          autoComplete="email"
          defaultValue="jan@"
          error="Podaj poprawny adres e-mail."
          hint="Wyślemy na niego potwierdzenie i link do zarządzania wizytą."
          label="E-mail"
          name="email"
          required
          type="email"
        />
      </div>
      <BookingField label="Uwagi (opcjonalnie)" multiline name="notes" />
      <fieldset className="grid gap-3">
        <legend className="sr-only">Zgody</legend>
        <ConsentCheckbox
          error="Zaakceptuj regulamin, aby zarezerwować wizytę."
          linkHref="#regulamin"
          linkLabel="regulamin rezerwacji"
          name="acceptTerms"
          text="Akceptuję"
        />
        <ConsentCheckbox
          error="Zaakceptuj politykę prywatności, aby zarezerwować wizytę."
          linkHref="#polityka"
          linkLabel="polityką prywatności"
          name="acceptPrivacy"
          text="Zapoznałem(-am) się z"
        />
      </fieldset>
      <PrimaryButton arrow className="justify-self-start" type="submit">
        Zapisz dane
      </PrimaryButton>
    </form>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "E-mail" }),
    ).toHaveAttribute("aria-invalid", "true");
    await expect(
      canvas.getByRole("checkbox", { name: "Akceptuję regulamin rezerwacji" }),
    ).toBeRequired();
  },
};

/** Help in a crisis under every step of the wizard (#247). */
export const CrisisNote: Story = {
  render: () => (
    <BookingCrisisNote
      href="/pomoc-w-kryzysie"
      lines={[
        {
          number: "112",
          label: "Numer alarmowy",
          detail: "gdy życie jest w bezpośrednim zagrożeniu",
        },
        {
          number: "116 123",
          label: "Kryzysowy Telefon Zaufania",
          detail: "dla dorosłych",
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "116 123" })).toHaveAttribute(
      "href",
      "tel:116123",
    );
  },
};
