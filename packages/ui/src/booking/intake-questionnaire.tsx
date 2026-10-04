"use client";

import {
  CRISIS_LINES,
  INTAKE_QUESTIONS,
  MOOD_LEVELS,
  intakeOutcome,
  needsNeurodiversityQuestion,
  type IntakeAnswers,
  type IntakeQuestion,
} from "@repo/contracts/intake";
import { Phone } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { cn } from "../lib/utils";
import { PrimaryButton, SecondaryButton } from "../public-site/actions";

// The short questionnaire before a first consultation (the booking
// wizard): why it is asked, the mood on a scale of 0 to 10, what the client
// struggles with, where and how they would like support, then their consent
// to process these health data. At 0 there is no booking: the crisis lines
// instead (a mistaken answer can still be changed). At 1 or 2 the lines
// are shown and the test goes on. The crisis line is at hand on every step.

type Draft = Omit<IntakeAnswers, "mood" | "healthConsent"> & {
  mood: number | null;
};

const EMPTY: Draft = {
  mood: null,
  difficulties: [],
  lifeAreas: [],
  support: [],
  neurodiversity: undefined as unknown as Draft["neurodiversity"],
  neurodiversityNeeds: [],
};

type Step = "intro" | "mood" | IntakeQuestion["id"] | "consent";

const REASONS = [
  {
    title: "Dopasowanie",
    text: "Pomaga dobrać specjalistę i formę wsparcia do Twoich potrzeb.",
  },
  {
    title: "Poufność",
    text: "Odpowiedzi zobaczy tylko specjalista, z którym się spotkasz, i centrum.",
  },
  {
    title: "Czas",
    text: "To pierwszy etap konsultacji: na spotkaniu nie zaczynamy od zera.",
  },
];

function CrisisLines({ title, children }: { title: string; children: string }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="rounded-card-sm border-pink/40 bg-pink-soft/60 grid gap-3 border p-4"
    >
      <h3 className="text-ink font-semibold" id={id}>
        {title}
      </h3>
      <p className="text-small text-ink">{children}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CRISIS_LINES.map((line) => (
          <li
            className="bg-surface rounded-card-sm grid gap-0.5 p-3"
            key={line.number}
          >
            <a
              className="text-ink text-lg font-semibold tabular-nums underline-offset-4 hover:underline"
              href={`tel:${line.number.replace(/\s/g, "")}`}
            >
              {line.number}
            </a>
            <span className="text-small text-ink">{line.label}</span>
            <span className="text-small text-text-muted">{line.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function IntakeQuestionnaire({
  onSubmit,
  error,
}: {
  /** Keeps the answers (a server action); it moves on, or says why not. */
  onSubmit: (answers: IntakeAnswers) => Promise<{ message: string } | void>;
  /** Why the last attempt was refused. */
  error?: string;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [consent, setConsent] = useState(false);
  const [at, setAt] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(at);

  const steps: Step[] = [
    "intro",
    "mood",
    "difficulties",
    "lifeAreas",
    "support",
    "neurodiversity",
    ...(draft.neurodiversity &&
    needsNeurodiversityQuestion(draft.neurodiversity)
      ? (["neurodiversityNeeds"] as const)
      : []),
    "consent",
  ];
  const step = steps[at] ?? "intro";
  const outcome = draft.mood === null ? null : intakeOutcome(draft.mood);
  const question = INTAKE_QUESTIONS.find((one) => one.id === step);

  // A new step: its question takes the focus (not when the page opens,
  // even as effects run twice in development).
  useEffect(() => {
    if (shown.current === at) return;
    shown.current = at;
    heading.current?.focus();
  }, [at]);

  const go = (to: number) => {
    setStepError(null);
    setAt(to);
  };

  const answered = () => {
    if (step === "mood") return draft.mood !== null;
    if (!question) return true;
    const value = draft[question.id];
    return Array.isArray(value) ? value.length > 0 : Boolean(value);
  };

  const next = () => {
    if (!answered()) {
      setStepError("Wybierz co najmniej jedną odpowiedź.");
      return;
    }
    go(at + 1);
  };

  const toggle = (id: IntakeQuestion["id"], option: string) =>
    setDraft((was) => {
      const chosen = ([] as string[]).concat(was[id] ?? []);
      return {
        ...was,
        [id]: chosen.includes(option)
          ? chosen.filter((one) => one !== option)
          : [...chosen, option],
      };
    });

  const choose = (id: IntakeQuestion["id"], option: string) =>
    setDraft((was) => ({
      ...was,
      [id]: option,
      // Another answer about neurodiversity: the needs asked anew.
      ...(id === "neurodiversity" && !needsNeurodiversityQuestion(option)
        ? { neurodiversityNeeds: [] }
        : {}),
    }));

  const submit = () => {
    if (!consent) {
      setStepError("Potrzebujemy Twojej zgody, aby zapisać odpowiedzi.");
      return;
    }
    if (draft.mood === null) return;
    startTransition(async () => {
      const refused = await onSubmit({
        ...draft,
        mood: draft.mood!,
        neurodiversityNeeds:
          draft.neurodiversity &&
          needsNeurodiversityQuestion(draft.neurodiversity)
            ? draft.neurodiversityNeeds
            : [],
        healthConsent: true,
      });
      if (refused) setStepError(refused.message);
    });
  };

  const total = steps.length - 1;

  return (
    <div className="rounded-card bg-surface border-border grid gap-6 border p-5 sm:p-8">
      {step !== "intro" ? (
        <div className="grid gap-2">
          <p className="text-small text-text-muted">
            Krok {at} z {total}
          </p>
          <div
            aria-hidden="true"
            className="bg-primary-soft h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary ease-soft h-full rounded-full transition-[width] duration-300"
              style={{ width: `${(at / total) * 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {step === "intro" ? (
        <div className="grid gap-6">
          <div className="grid gap-2">
            <h2
              className="font-display text-ink text-2xl"
              ref={heading}
              tabIndex={-1}
            >
              Zanim umówisz konsultację
            </h2>
            <p className="text-ink max-w-copy">
              Przed wyborem terminu prosimy o krótki test (około 3 minut).
              Pomoże nam lepiej Cię poznać i przygotować pierwsze spotkanie.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {REASONS.map((reason) => (
              <li
                className="rounded-card-sm bg-primary-soft/50 grid gap-1 p-4"
                key={reason.title}
              >
                <span className="text-ink font-semibold">{reason.title}</span>
                <span className="text-small text-ink">{reason.text}</span>
              </li>
            ))}
          </ul>
          <div>
            <PrimaryButton arrow onClick={() => go(1)} type="button">
              Rozpocznij test
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {step === "mood" ? (
        <div className="grid gap-5">
          <h2
            className="font-display text-ink text-2xl"
            id="intake-mood"
            ref={heading}
            tabIndex={-1}
          >
            Jak oceniasz swoje samopoczucie?
          </h2>
          <div
            aria-labelledby="intake-mood"
            className="flex flex-wrap gap-2"
            role="radiogroup"
          >
            {MOOD_LEVELS.map((_, value) => (
              <label
                className={cn(
                  "has-[input:focus-visible]:outline-ring flex size-11 cursor-pointer items-center justify-center rounded-full border font-semibold tabular-nums transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2",
                  draft.mood === value
                    ? "bg-primary border-primary text-on-primary"
                    : "border-border bg-surface text-ink hover:border-border-strong",
                )}
                key={value}
              >
                <input
                  checked={draft.mood === value}
                  className="sr-only"
                  name="mood"
                  onChange={() => {
                    setStepError(null);
                    setDraft((was) => ({ ...was, mood: value }));
                  }}
                  type="radio"
                  value={value}
                />
                {value}
              </label>
            ))}
          </div>
          <p aria-live="polite" className="text-ink max-w-copy min-h-12">
            {draft.mood === null
              ? "0 to najgorsze samopoczucie, 10 najlepsze."
              : MOOD_LEVELS[draft.mood]}
          </p>
          {outcome === "crisis" ? (
            <CrisisLines title="Nie musisz zmagać się z tym samodzielnie">
              Wygląda na to, że przechodzisz teraz przez bardzo trudny czas.
              Prosimy, nie czekaj na konsultację: zadzwoń teraz, pod tymi
              numerami ktoś porozmawia z Tobą od razu.
            </CrisisLines>
          ) : outcome === "struggling" ? (
            <CrisisLines title="Jeśli potrzebujesz pomocy teraz">
              Możesz dokończyć test i umówić konsultację. Jeśli jednak jest Ci
              bardzo ciężko już dziś, porozmawiaj z kimś od razu.
            </CrisisLines>
          ) : null}
        </div>
      ) : null}

      {question ? (
        <fieldset className="grid gap-4">
          <legend className="contents">
            <h2
              className="font-display text-ink text-2xl"
              ref={heading}
              tabIndex={-1}
            >
              {question.title}
            </h2>
          </legend>
          {question.multiple ? (
            <p className="text-small text-text-muted">
              Możesz wybrać kilka odpowiedzi.
            </p>
          ) : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => {
              const value = draft[question.id];
              const checked = question.multiple
                ? ([] as string[]).concat(value ?? []).includes(option.id)
                : value === option.id;
              return (
                <li key={option.id}>
                  <label
                    className={cn(
                      "rounded-card-sm has-[input:focus-visible]:outline-ring flex h-full cursor-pointer items-start gap-3 border p-3 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2",
                      checked
                        ? "border-primary bg-primary-soft/60"
                        : "border-border hover:border-border-strong",
                    )}
                  >
                    <input
                      checked={checked}
                      className="accent-primary mt-0.5 size-5 shrink-0"
                      name={question.id}
                      onChange={() => {
                        setStepError(null);
                        if (question.multiple) toggle(question.id, option.id);
                        else choose(question.id, option.id);
                      }}
                      type={question.multiple ? "checkbox" : "radio"}
                      value={option.id}
                    />
                    <span className="text-ink">{option.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}

      {step === "consent" ? (
        <div className="grid gap-4">
          <h2
            className="font-display text-ink text-2xl"
            ref={heading}
            tabIndex={-1}
          >
            Dziękujemy za odpowiedzi
          </h2>
          <p className="text-ink max-w-copy">
            Zapiszemy je razem z Twoją rezerwacją. Zobaczy je tylko specjalista,
            z którym się spotkasz, i centrum.
          </p>
          <label className="flex items-start gap-3">
            <input
              checked={consent}
              className="accent-primary mt-1 size-5 shrink-0"
              onChange={(event) => {
                setStepError(null);
                setConsent(event.target.checked);
              }}
              type="checkbox"
            />
            <span className="text-small text-ink">
              Wyrażam zgodę na przetwarzanie danych o moim zdrowiu podanych w
              teście, aby przygotować konsultację. Zgodę mogę wycofać w każdej
              chwili.
            </span>
          </label>
        </div>
      ) : null}

      {stepError || error ? (
        <p className="text-small text-pink-strong" role="alert">
          {stepError ?? error}
        </p>
      ) : null}

      {step !== "intro" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={() => go(at - 1)} type="button">
            Wstecz
          </SecondaryButton>
          {step === "consent" ? (
            <PrimaryButton
              arrow
              disabled={pending}
              onClick={submit}
              type="button"
            >
              Zapisz i wybierz termin
            </PrimaryButton>
          ) : outcome === "crisis" && step === "mood" ? null : (
            <PrimaryButton arrow onClick={next} type="button">
              Dalej
            </PrimaryButton>
          )}
        </div>
      ) : null}

      <p className="text-small text-text-muted border-border border-t pt-4">
        Linia wsparcia dla osób w stanie kryzysu psychicznego (całodobowo):{" "}
        <a
          className="text-ink font-semibold tabular-nums underline-offset-4 hover:underline"
          href="tel:800702222"
        >
          800 702 222
        </a>
      </p>
    </div>
  );
}
