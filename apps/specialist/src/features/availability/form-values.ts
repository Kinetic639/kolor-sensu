import type {
  AvailabilityRuleInput,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import { isoWeekday } from "@repo/scheduling";
import { toRuleInput } from "./rule-copies";

// Starting values of the availability forms. New windows are one-offs
// unless the specialist makes them a rule, as in calendar apps.

function oneOff(
  validFrom: string,
  values: Partial<AvailabilityRuleInput>,
): AvailabilityRuleInput {
  return {
    recurrence: "once",
    weekdays: [isoWeekday(validFrom)],
    intervalWeeks: 1,
    startsAt: "09:00",
    endsAt: "17:00",
    ends: "never",
    validUntil: null,
    occurrenceCount: null,
    mode: "in_person",
    roomId: null,
    note: null,
    ...values,
    validFrom,
  };
}

/**
 * The drawer's values: a new window, a whole rule, or (with
 * `occurrenceDate`) one occurrence of it, dated that day.
 */
export function ruleFormValues(
  rule: SpecialistAvailabilityRule | null,
  {
    today,
    prefill = {},
    occurrenceDate,
  }: {
    today: string;
    prefill?: Partial<AvailabilityRuleInput>;
    occurrenceDate?: string;
  },
): AvailabilityRuleInput {
  if (!rule) return oneOff(prefill.validFrom ?? today, prefill);
  const values = toRuleInput(rule);
  return occurrenceDate ? { ...values, validFrom: occurrenceDate } : values;
}

/** After a drag: those hours on that day only, in the first room. */
export function quickCreateDefaults(
  selection: { date: string; startsAt: string; endsAt: string },
  rooms: { id: string }[],
): AvailabilityRuleInput {
  return oneOff(selection.date, {
    startsAt: selection.startsAt,
    endsAt: selection.endsAt,
    mode: rooms.length ? "in_person" : "online",
    roomId: rooms[0]?.id ?? null,
  });
}
