import type { VisitPanelIntake } from "./visit-panel";

// The questionnaire before a consultation (as @repo/supabase/intakes
// reads it) as the visit's panel shows it: when it was given, in the
// centre's time, and a low mood said at the top.

export function visitPanelIntake(
  intake: {
    outcome: "crisis" | "struggling" | "ok";
    givenAt: string;
    rows: { label: string; value: string }[];
  },
  timeZone: string,
): VisitPanelIntake {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("pl-PL", {
      timeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(intake.givenAt))
      .map((part) => [part.type, part.value]),
  );
  return {
    givenAt: `${parts.day}.${parts.month}, ${parts.hour}:${parts.minute}`,
    lowMood: intake.outcome !== "ok",
    rows: intake.rows,
  };
}
