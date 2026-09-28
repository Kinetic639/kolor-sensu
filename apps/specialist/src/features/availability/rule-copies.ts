import type {
  AvailabilityRuleInput,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import { addDays } from "@repo/scheduling";

// Form values from stored rules, and the quick changes of the availability
// page ("Skopiuj na kolejny dzień", "Na cały tydzień", the Monday–Friday
// template). The database still checks every change for overlaps and rooms.

const WORKDAYS = [1, 2, 3, 4, 5];

export function toRuleInput(
  rule: SpecialistAvailabilityRule,
): AvailabilityRuleInput {
  const once = rule.recurrence === "once";
  return {
    recurrence: rule.recurrence,
    weekdays: rule.weekdays,
    intervalWeeks: rule.intervalWeeks,
    startsAt: rule.startsAt,
    endsAt: rule.endsAt,
    validFrom: rule.validFrom,
    ends: once
      ? "never"
      : rule.occurrenceCount
        ? "count"
        : rule.validUntil
          ? "until"
          : "never",
    validUntil: once ? null : rule.validUntil,
    occurrenceCount: rule.occurrenceCount,
    mode: rule.mode,
    roomId: rule.roomId,
    note: rule.note,
  };
}

/** The same hours a day later: a one-off's date, or each of a rule's days. */
export function nextDayCopy(
  rule: SpecialistAvailabilityRule,
): AvailabilityRuleInput {
  const input = toRuleInput(rule);
  if (rule.recurrence === "once") {
    return { ...input, validFrom: addDays(rule.validFrom, 1) };
  }
  return {
    ...input,
    weekdays: [...new Set(rule.weekdays.map((day) => (day % 7) + 1))].sort(
      (a, b) => a - b,
    ),
  };
}

/** "Na cały tydzień": the rule on every working day. */
export function withWorkdays(
  rule: SpecialistAvailabilityRule,
): AvailabilityRuleInput {
  return { ...toRuleInput(rule), weekdays: WORKDAYS };
}

/** One rule: Monday to Friday, 9:00–17:00, every week, in the room or online. */
export function weekTemplate({
  validFrom,
  roomId,
}: {
  validFrom: string;
  roomId: string | null;
}): AvailabilityRuleInput {
  return {
    recurrence: "weekly",
    weekdays: WORKDAYS,
    intervalWeeks: 1,
    startsAt: "09:00",
    endsAt: "17:00",
    validFrom,
    ends: "never",
    validUntil: null,
    occurrenceCount: null,
    mode: roomId ? "in_person" : "online",
    roomId,
    note: null,
  };
}
