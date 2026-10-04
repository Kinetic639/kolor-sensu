import { describe, expect, it } from "vitest";
import {
  CRISIS_LINES,
  INTAKE_QUESTIONS,
  MOOD_LEVELS,
  intakeAnswersSchema,
  intakeOutcome,
  intakeSummary,
  needsNeurodiversityQuestion,
} from "./intake";

const answers = {
  mood: 5,
  difficulties: ["anxiety", "stress"],
  lifeAreas: ["emotional"],
  support: ["regular-therapy"],
  neurodiversity: "none",
  neurodiversityNeeds: [],
  healthConsent: true,
};

describe("the questionnaire before a first consultation", () => {
  it("asks about mood on a scale of 0 to 10, each step described", () => {
    expect(MOOD_LEVELS).toHaveLength(11);
    expect(MOOD_LEVELS[0]).toMatch(/myśli samobójcze/);
    expect(MOOD_LEVELS[10]).toMatch(/pełnię życia/);
  });

  it("its questions, each with its options", () => {
    expect(INTAKE_QUESTIONS.map((question) => question.id)).toEqual([
      "difficulties",
      "lifeAreas",
      "support",
      "neurodiversity",
      "neurodiversityNeeds",
    ]);
    expect(INTAKE_QUESTIONS[0]!.title).toBe(
      "Z jakimi trudnościami emocjonalnymi aktualnie się zmagasz?",
    );
    expect(INTAKE_QUESTIONS[0]!.options).toHaveLength(10);
  });

  it("valid answers, with the consent to process health data", () => {
    expect(intakeAnswersSchema.safeParse(answers).success).toBe(true);
    expect(
      intakeAnswersSchema.safeParse({ ...answers, healthConsent: false })
        .success,
    ).toBe(false);
    expect(
      intakeAnswersSchema.safeParse({ ...answers, difficulties: [] }).success,
    ).toBe(false);
    expect(
      intakeAnswersSchema.safeParse({ ...answers, difficulties: ["made-up"] })
        .success,
    ).toBe(false);
  });

  it("the needs only after a diagnosis or a suspicion of neurodiversity", () => {
    expect(needsNeurodiversityQuestion("diagnosed")).toBe(true);
    expect(needsNeurodiversityQuestion("suspected")).toBe(true);
    expect(needsNeurodiversityQuestion("unsure")).toBe(false);
    expect(needsNeurodiversityQuestion("none")).toBe(false);
    expect(
      intakeAnswersSchema.safeParse({
        ...answers,
        neurodiversityNeeds: ["daily-challenges"],
      }).success,
    ).toBe(false);
    expect(
      intakeAnswersSchema.safeParse({
        ...answers,
        neurodiversity: "diagnosed",
        neurodiversityNeeds: ["daily-challenges"],
      }).success,
    ).toBe(true);
  });
});

describe("intakeOutcome", () => {
  it("0: a crisis, no visit booked but help pointed to", () => {
    expect(intakeOutcome(0)).toBe("crisis");
  });
  it("1 or 2: help pointed to, the booking goes on", () => {
    expect(intakeOutcome(1)).toBe("struggling");
    expect(intakeOutcome(2)).toBe("struggling");
  });
  it("3 and up: the booking goes on", () => {
    expect(intakeOutcome(3)).toBe("ok");
    expect(intakeOutcome(10)).toBe("ok");
  });
  it("help: the crisis line round the clock, and emergency", () => {
    expect(CRISIS_LINES.map((line) => line.number)).toEqual([
      "800 702 222",
      "116 123",
      "116 111",
      "112",
    ]);
  });
});

describe("intakeSummary", () => {
  it("the answers as the specialist reads them", () => {
    expect(
      intakeSummary({
        ...answers,
        neurodiversity: "suspected",
        neurodiversityNeeds: ["sensory"],
      }),
    ).toEqual([
      {
        label: "Samopoczucie",
        value: `5/10 · ${MOOD_LEVELS[5]}`,
      },
      { label: "Trudności", value: "Lęk, Stres" },
      {
        label: "Obszary wsparcia",
        value: "Emocjonalne (np. radzenie sobie z emocjami, regulacja emocji)",
      },
      { label: "Pomocne wsparcie", value: "Regularne spotkania terapeutyczne" },
      {
        label: "Neuroróżnorodność",
        value: "Nie mam diagnozy, ale podejrzewam u siebie neuroatypowość",
      },
      {
        label: "Potrzeby",
        value: "Radzenie sobie z nadwrażliwością sensoryczną",
      },
    ]);
  });
});
