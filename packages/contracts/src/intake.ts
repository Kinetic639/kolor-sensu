import { z } from "zod";

// The short questionnaire before a first consultation (the booking
// wizard): how the client feels, what they struggle with, where and how they
// would like support. It helps the specialist prepare, and it points a
// person in crisis to help at once instead of to a visit weeks away: at 0
// ("thoughts of suicide") no visit is booked, only the crisis lines are
// shown; at 1 or 2 the lines are shown and the booking goes on.
//
// Answers are kept as the options' ids (the labels may be reworded later;
// `version` says which wording they were given in). They are health data:
// given with the client's explicit consent, read only by the centre and
// the visit's specialist.

export const INTAKE_VERSION = 1;

/** How the client feels, 0 to 10, each step in their words. */
export const MOOD_LEVELS = [
  "Jestem osobą, która ma myśli samobójcze i nie widzi sensu życia.",
  "Jestem osobą czującą głęboką rozpacz i beznadzieję, trudno mi wstać z łóżka.",
  "Jestem osobą z silnym poczuciem przygnębienia, nie widzę wyjścia z trudnej sytuacji.",
  "Jestem osobą odczuwającą smutek i zniechęcenie, brak mi energii do codziennych czynności.",
  "Jestem osobą przygnębioną, ale funkcjonującą minimalnie w codziennych obowiązkach.",
  "Jestem osobą czującą się neutralnie, ani dobrze, ani tragicznie, moje emocje są stłumione.",
  "Jestem osobą, której stan się poprawia, mam przebłyski lepszego samopoczucia, ale nadal czuję wewnętrzny ciężar.",
  "Jestem osobą, która czuje się w miarę dobrze, potrafię cieszyć się niektórymi chwilami, choć czasem bywa ciężko.",
  "Jestem osobą, która czuje się dobrze, z pozytywnym nastawieniem do codziennego życia.",
  "Jestem osobą zadowoloną, czuję radość i spokój, większość rzeczy układa się po mojej myśli.",
  "Jestem osobą szczęśliwą, czuję pełnię życia, harmonię i satysfakcję z codziennych działań.",
] as const;

/** Where to call in a crisis, in the order to show them. */
export const CRISIS_LINES = [
  {
    number: "800 702 222",
    label: "Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego",
    detail: "całodobowo, bezpłatnie",
  },
  {
    number: "116 123",
    label: "Kryzysowy Telefon Zaufania",
    detail: "dla dorosłych",
  },
  {
    number: "116 111",
    label: "Telefon Zaufania dla Dzieci i Młodzieży",
    detail: "całodobowo",
  },
  {
    number: "112",
    label: "Numer alarmowy",
    detail: "gdy życie jest w bezpośrednim zagrożeniu",
  },
] as const;

const DIFFICULTIES = [
  ["anxiety", "Lęk"],
  ["depression", "Depresja"],
  ["stress", "Stres"],
  ["relationships", "Trudności w relacjach"],
  ["focus", "Trudności z koncentracją i pamięcią"],
  ["sleep", "Bezsenność lub wybudzanie się"],
  ["self-esteem", "Niskie poczucie własnej wartości"],
  ["burnout", "Wypalenie zawodowe"],
  ["decisions", "Trudności w podejmowaniu decyzji"],
  ["unsure", "Trudno powiedzieć"],
] as const;

const LIFE_AREAS = [
  [
    "emotional",
    "Emocjonalne (np. radzenie sobie z emocjami, regulacja emocji)",
  ],
  [
    "relational",
    "Relacyjne (np. poprawa komunikacji z innymi, bliskie związki)",
  ],
  ["work", "Zawodowe (np. stres w pracy, brak motywacji)"],
  ["education", "Edukacyjne (np. trudności w nauce, przyswajaniu wiedzy)"],
  [
    "personal-growth",
    "Rozwój osobisty (np. lepsze zrozumienie siebie, rozwijanie nowych umiejętności)",
  ],
  ["family", "Rodzinne (np. trudności w relacjach rodzinnych)"],
  ["unsure", "Trudno powiedzieć"],
] as const;

const SUPPORT = [
  ["regular-therapy", "Regularne spotkania terapeutyczne"],
  ["psychoeducation", "Wsparcie psychoedukacyjne (np. szkolenia, warsztaty)"],
  ["support-groups", "Grupy wsparcia"],
  ["planning", "Wsparcie w planowaniu i organizacji zadań"],
  ["stress-management", "Techniki zarządzania stresem"],
  ["practical-tools", "Praktyczne narzędzia do pracy nad emocjami i relacjami"],
  ["diagnosis", "Wsparcie diagnostyczne i konsultacje"],
  ["unsure", "Nie wiem"],
] as const;

const NEURODIVERSITY = [
  ["diagnosed", "Tak, mam diagnozę"],
  ["suspected", "Nie mam diagnozy, ale podejrzewam u siebie neuroatypowość"],
  ["unsure", "Nie mam pewności, potrzebuję konsultacji"],
  ["none", "Nie mam diagnozy i nie podejrzewam neuroatypowości"],
] as const;

const NEURODIVERSITY_NEEDS = [
  ["understanding", "Lepsze zrozumienie własnych wzorców myślenia i działania"],
  ["daily-challenges", "Radzenie sobie z codziennymi wyzwaniami"],
  ["environment", "Przystosowanie środowiska pracy lub nauki"],
  ["sensory", "Radzenie sobie z nadwrażliwością sensoryczną"],
  ["emotions", "Lepsze zarządzanie emocjami"],
  ["social", "Wsparcie w kontaktach społecznych i relacjach"],
  ["unsure", "Nie wiem"],
] as const;

type Options = readonly (readonly [string, string])[];
const ids = <T extends Options>(options: T) =>
  options.map(([id]) => id) as unknown as [T[number][0], ...T[number][0][]];

export interface IntakeQuestion {
  id:
    | "difficulties"
    | "lifeAreas"
    | "support"
    | "neurodiversity"
    | "neurodiversityNeeds";
  /** As the client is asked. */
  title: string;
  /** As the specialist reads it, short. */
  label: string;
  multiple: boolean;
  options: { id: string; label: string }[];
}

const question = (
  id: IntakeQuestion["id"],
  title: string,
  label: string,
  multiple: boolean,
  options: Options,
): IntakeQuestion => ({
  id,
  title,
  label,
  multiple,
  options: options.map(([value, text]) => ({ id: value, label: text })),
});

/** After the mood, in the order they are asked. */
export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  question(
    "difficulties",
    "Z jakimi trudnościami emocjonalnymi aktualnie się zmagasz?",
    "Trudności",
    true,
    DIFFICULTIES,
  ),
  question(
    "lifeAreas",
    "Obszary życia, w których czujesz, że potrzebujesz wsparcia",
    "Obszary wsparcia",
    true,
    LIFE_AREAS,
  ),
  question(
    "support",
    "Jakie wsparcie byłoby dla Ciebie pomocne?",
    "Pomocne wsparcie",
    true,
    SUPPORT,
  ),
  question(
    "neurodiversity",
    "Czy masz diagnozę związaną z neuroróżnorodnością?",
    "Neuroróżnorodność",
    false,
    NEURODIVERSITY,
  ),
  question(
    "neurodiversityNeeds",
    "Jakie są Twoje potrzeby związane z neuroróżnorodnością?",
    "Potrzeby",
    true,
    NEURODIVERSITY_NEEDS,
  ),
];

type Neurodiversity = (typeof NEURODIVERSITY)[number][0];

/** The needs are asked only after a diagnosis or a suspicion. */
export function needsNeurodiversityQuestion(answer: string) {
  return answer === "diagnosed" || answer === "suspected";
}

const pick = (options: Options, message: string) =>
  z.array(z.enum(ids(options))).min(1, message);

export const intakeAnswersSchema = z
  .object({
    mood: z.number().int().min(0).max(10),
    difficulties: pick(DIFFICULTIES, "Wybierz co najmniej jedną odpowiedź."),
    lifeAreas: pick(LIFE_AREAS, "Wybierz co najmniej jeden obszar."),
    support: pick(SUPPORT, "Wybierz co najmniej jedną odpowiedź."),
    neurodiversity: z.enum(ids(NEURODIVERSITY), "Wybierz jedną z odpowiedzi."),
    neurodiversityNeeds: z.array(z.enum(ids(NEURODIVERSITY_NEEDS))).default([]),
    healthConsent: z.literal(true, "Potrzebujemy Twojej zgody."),
  })
  .superRefine((value, context) => {
    const asked = needsNeurodiversityQuestion(value.neurodiversity);
    if (asked && !value.neurodiversityNeeds.length) {
      context.addIssue({
        code: "custom",
        path: ["neurodiversityNeeds"],
        message: "Wybierz co najmniej jedną odpowiedź.",
      });
    }
    if (!asked && value.neurodiversityNeeds.length) {
      context.addIssue({
        code: "custom",
        path: ["neurodiversityNeeds"],
        message: "To pytanie nie dotyczy tej odpowiedzi.",
      });
    }
  });

export type IntakeAnswers = z.infer<typeof intakeAnswersSchema>;
export type { Neurodiversity };

/**
 * What the mood calls for: at 0 no visit (a crisis: the crisis lines
 * only), at 1 or 2 the lines shown with the booking going on.
 */
export function intakeOutcome(mood: number): "crisis" | "struggling" | "ok" {
  if (mood <= 0) return "crisis";
  if (mood <= 2) return "struggling";
  return "ok";
}

/** The answers as the centre and the specialist read them. */
export function intakeSummary(
  answers: Omit<IntakeAnswers, "healthConsent">,
): { label: string; value: string }[] {
  const rows = [
    {
      label: "Samopoczucie",
      value: `${answers.mood}/10 · ${MOOD_LEVELS[answers.mood] ?? ""}`,
    },
  ];
  for (const one of INTAKE_QUESTIONS) {
    const chosen = ([] as string[]).concat(answers[one.id] ?? []);
    if (!chosen.length) continue;
    rows.push({
      label: one.label,
      value: chosen
        .map(
          (id) => one.options.find((option) => option.id === id)?.label ?? id,
        )
        .join(", "),
    });
  }
  return rows;
}
