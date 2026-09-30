// "Nie wiesz od czego zacząć?": the matching behind GuidedChoiceSection.
// Plain data in, a suggestion out, so it can be tested and later replaced
// by the centre's real rules (or its booking data) without touching the UI.

export type GuidedAudience = "self" | "couple" | "child";
export type GuidedConcern =
  "anxiety" | "mood" | "relations" | "crisis" | "growth";
export type GuidedFormat = "office" | "online" | "any";

export interface GuidedAnswers {
  audience: GuidedAudience;
  concern: GuidedConcern;
  format: GuidedFormat;
}

export interface GuidedSpecialist {
  name: string;
  role: string;
  href: string;
  portraitSrc: string;
  audiences: readonly GuidedAudience[];
  concerns: readonly GuidedConcern[];
  /** Also meets online. */
  online: boolean;
}

export interface GuidedSuggestion {
  /** The form of support to start with. */
  service: string;
  /** One or two sentences: why, and what the first meeting looks like. */
  reason: string;
  /** Best matches first, at most two. */
  specialists: GuidedSpecialist[];
}

const services: Record<GuidedAudience, { service: string; reason: string }> = {
  self: {
    service: "Konsultacja psychologiczna",
    reason:
      "Na pierwszym spotkaniu sprawdzimy, czego potrzebujesz, i razem zdecydujemy, czy dobrym kolejnym krokiem będzie psychoterapia indywidualna.",
  },
  couple: {
    service: "Psychoterapia par",
    reason:
      "Zaczynamy od wspólnej konsultacji, na której każde z Was może opowiedzieć, jak widzi sytuację.",
  },
  child: {
    service: "Wsparcie dla dzieci i młodzieży",
    reason:
      "Pierwsze spotkanie odbywa się z rodzicem lub opiekunem, bez dziecka. Dopiero potem planujemy spotkania z nim.",
  },
};

// Concerns that change what we suggest first, whoever the help is for.
const overrides: Partial<
  Record<
    GuidedConcern,
    Partial<Record<GuidedAudience, GuidedSuggestion["reason"]>>
  >
> = {
  crisis: {
    self: "Po trudnym wydarzeniu zaczynamy od konsultacji kryzysowej: krótszej drogi do rozmowy i konkretnego wsparcia na najbliższe dni.",
  },
  growth: {
    self: "Jeśli chcesz lepiej siebie poznać, zaczniemy od konsultacji. Czasem najlepszym dalszym krokiem są warsztaty, czasem psychoterapia.",
  },
};

export function matchSupport(
  answers: GuidedAnswers,
  specialists: readonly GuidedSpecialist[],
): GuidedSuggestion {
  const base = services[answers.audience];
  const reason = overrides[answers.concern]?.[answers.audience] ?? base.reason;
  const service =
    answers.concern === "crisis" && answers.audience === "self"
      ? "Konsultacja kryzysowa"
      : base.service;

  const score = (specialist: GuidedSpecialist) =>
    (specialist.concerns.includes(answers.concern) ? 2 : 0) +
    (specialist.online ? 0.5 : 0);
  const matches = specialists
    .filter((specialist) => specialist.audiences.includes(answers.audience))
    .filter((specialist) => answers.format !== "online" || specialist.online)
    // Stable: equal scores keep the team's order.
    .map((specialist, index) => ({ specialist, index }))
    .sort(
      (a, b) => score(b.specialist) - score(a.specialist) || a.index - b.index,
    )
    .slice(0, 2)
    .map(({ specialist }) => specialist);

  return { service, reason, specialists: matches };
}
