import type {
  AvailabilityRuleInput,
  RoomOccupancy,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import { isoWeekday, occursOn } from "@repo/scheduling";
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

/**
 * Rooms other specialists have at a window's hours, among the known
 * occupancy (the shown week): room id → who has it first. A hint for the
 * forms; the database refuses a taken room in any week.
 */
export function roomConflicts(
  occupancy: RoomOccupancy[],
  window: Pick<
    AvailabilityRuleInput,
    "recurrence" | "weekdays" | "validFrom" | "startsAt" | "endsAt"
  > & { intervalWeeks?: number; validUntil?: string | null },
): Map<string, RoomOccupancy> {
  const conflicts = new Map<string, RoomOccupancy>();
  for (const one of occupancy) {
    const occurs = occursOn(
      {
        recurrence: window.recurrence,
        weekdays: window.weekdays,
        intervalWeeks: window.intervalWeeks ?? 1,
        validFrom: window.validFrom,
        validUntil: window.validUntil ?? null,
        exceptions: [],
      },
      one.date,
    );
    if (
      occurs &&
      one.startsAt < window.endsAt &&
      window.startsAt < one.endsAt &&
      !conflicts.has(one.roomId)
    ) {
      conflicts.set(one.roomId, one);
    }
  }
  return conflicts;
}

/**
 * After a drag: those hours on that day only, in the room shown over the
 * calendar or else the first free one (none
 * when all are taken: the specialist picks online or other hours).
 */
export function quickCreateDefaults(
  selection: {
    date: string;
    startsAt: string;
    endsAt: string;
    /** The room shown over the calendar, preferred when free. */
    roomId?: string | null;
  },
  rooms: { id: string }[],
  occupancy: RoomOccupancy[] = [],
): AvailabilityRuleInput {
  const taken = roomConflicts(occupancy, {
    recurrence: "once",
    weekdays: [isoWeekday(selection.date)],
    validFrom: selection.date,
    startsAt: selection.startsAt,
    endsAt: selection.endsAt,
  });
  const free = rooms.filter((one) => !taken.has(one.id));
  const room = free.find((one) => one.id === selection.roomId) ?? free[0];
  return oneOff(selection.date, {
    startsAt: selection.startsAt,
    endsAt: selection.endsAt,
    mode: rooms.length ? "in_person" : "online",
    roomId: room?.id ?? null,
  });
}
