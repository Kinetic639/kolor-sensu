import { closureDates, type Closure } from "@repo/contracts/closures";

// The centre's closed days as Ustawienia lists them: those now and to come
// first (the soonest first), then the past (the latest first); each with
// its state, its days and the visits still booked on them.

const STATES = {
  current: { label: "Trwa", tone: "warning", order: 0 },
  scheduled: { label: "Zaplanowane", tone: "info", order: 1 },
  past: { label: "Minęło", tone: "neutral", order: 2 },
} as const;

type State = keyof typeof STATES;

export type ClosureRow = Closure & {
  state: State;
  stateLabel: string;
  tone: (typeof STATES)[State]["tone"];
  /** `24.12–31.12.2026` */
  dates: string;
  /** How many days. */
  days: number;
  /** Visits booked on them (to move). */
  visits: number;
};

const dayCount = ({ startsOn, endsOn }: Closure) =>
  Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86_400_000) + 1;

export function closureRows(
  closures: Closure[],
  today: string,
  visits: Record<string, number> = {},
): ClosureRow[] {
  return closures
    .map((closure) => {
      const state: State =
        closure.endsOn < today
          ? "past"
          : closure.startsOn <= today
            ? "current"
            : "scheduled";
      return {
        ...closure,
        state,
        stateLabel: STATES[state].label,
        tone: STATES[state].tone,
        dates: closureDates(closure),
        days: dayCount(closure),
        visits: visits[closure.id] ?? 0,
      };
    })
    .sort((a, b) => {
      const byState = STATES[a.state].order - STATES[b.state].order;
      if (byState) return byState;
      return a.state === "past"
        ? b.startsOn.localeCompare(a.startsOn)
        : a.startsOn.localeCompare(b.startsOn);
    });
}
