import type {
  AvailabilityMode,
  SpecialistAvailabilityRule,
} from "@repo/contracts";
import type { AvailabilityPreviewDay } from "@repo/ui/availability";

export interface RuleViewModel {
  id: string;
  timeLabel: string;
  placeLabel: string;
  mode: AvailabilityMode;
  note: string | null;
  /** The stored window, for editing. */
  rule: SpecialistAvailabilityRule;
}

export interface AvailabilityViewModel {
  /** Monday to Sunday, recurring windows that have not ended. */
  weekly: {
    weekday: number;
    label: string;
    windows: (RuleViewModel & { recurrenceLabel: string })[];
  }[];
  /** Upcoming one-day windows, by date. */
  oneOff: (RuleViewModel & { label: string })[];
  /** Time off that has not ended yet. */
  timeOff: { id: string; label: string; reason: string | null }[];
  preview: {
    title: string;
    /** Mondays of the neighbouring weeks, for `?tydzien=`. */
    previousWeek: string;
    nextWeek: string;
    days: AvailabilityPreviewDay[];
    hoursLabel: string;
  };
  rooms: { id: string; name: string }[];
}
