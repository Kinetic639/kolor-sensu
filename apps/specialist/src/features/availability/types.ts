import type {
  AvailabilityMode,
  RoomOccupancy,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import type { MinuteRange } from "@repo/scheduling";

export interface RoomViewModel {
  id: string;
  name: string;
  /** CSS colour of the room in the calendar. */
  accent: string;
}

export interface CalendarWindowViewModel {
  id: string;
  ruleId: string;
  /** Minutes since local midnight. */
  start: number;
  end: number;
  timeLabel: string;
  placeLabel: string;
  mode: AvailabilityMode;
  accent: string;
  tint: string;
  note: string | null;
  /** Part of a repeating rule (changes ask which occurrences). */
  recurring: boolean;
  recurrenceLabel: string;
}

export interface CalendarDayViewModel {
  date: string;
  /** "Pon" */
  label: string;
  /** "7 stycznia" */
  sublabel: string;
  /** "Poniedziałek, 7 stycznia 2030", for screen readers. */
  fullLabel: string;
  isToday: boolean;
  /** The day's hours, `null` without any. */
  hoursLabel: string | null;
  windows: CalendarWindowViewModel[];
  timeOff: { id: string; start: number; end: number; label: string }[];
  /** The chosen room: who else has it, and when it is closed. */
  room: {
    busy: {
      id: string;
      start: number;
      end: number;
      timeLabel: string;
      specialistName: string;
      label: string;
    }[];
    closed: { start: number; end: number; label: string }[];
  };
}

/** The room shown over the calendar. */
export interface RoomFocusViewModel {
  id: string;
  name: string;
  accent: string;
  /** "Pn–Pt 08:00–18:00", or null without opening hours. */
  hoursLabel: string | null;
  /** "2 bloki innych specjalistów", or null when nobody else has it. */
  busyLabel: string | null;
}

export interface RuleItemViewModel {
  id: string;
  title: string;
  subtitle: string | null;
  recurrenceLabel: string;
  timeLabel: string;
  durationLabel: string;
  placeLabel: string;
  mode: AvailabilityMode;
  accent: string;
  note: string | null;
  occupancy: { percent: number; bookedLabel: string; freeLabel: string };
  canCopyToWorkdays: boolean;
  /** The stored window, for editing. */
  rule: SpecialistAvailabilityRule;
}

export interface AvailabilityViewModel {
  rooms: RoomViewModel[];
  calendar: {
    /** "7–13 stycznia 2030" */
    title: string;
    week: string;
    previousWeek: string;
    nextWeek: string;
    range: MinuteRange;
    days: CalendarDayViewModel[];
    stats: { available: string; booked: string; free: string };
    roomFocus: RoomFocusViewModel | null;
    /** Other specialists' hours this week in every room. */
    othersOccupancy: RoomOccupancy[];
  };
  rules: {
    items: RuleItemViewModel[];
    /** Current rules, before filtering. */
    total: number;
    /** Current rules per ISO weekday. */
    dayCounts: Record<number, number>;
    metrics: { weekly: string; booked: string; free: string };
  };
  timeOff: { id: string; label: string; reason: string | null }[];
}
