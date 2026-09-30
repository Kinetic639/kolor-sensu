import {
  addDays,
  formatDate,
  formatDateRange,
  formatWeekday,
  mondayOf,
  type FreeSlot,
} from "@repo/scheduling";
import type { SlotPickerProps } from "@repo/ui/booking";
import type { Route } from "next";
import { createLoader, createSerializer } from "nuqs/server";
import { bookingParsers } from "./search-params";
import { weekOfSlots } from "./wizard";

// Moving a visit (docs/product/booking-plan.md, R8): the week and the chosen
// time live in the address, as in the wizard; the page is rendered on the
// server and every time is a plain link. Pure, so it is tested without a
// database.

const rescheduleParsers = {
  tydzien: bookingParsers.tydzien,
  termin: bookingParsers.termin,
};

export type RescheduleParams = {
  tydzien: string | null;
  termin: string | null;
};

export const loadRescheduleParams = createLoader(rescheduleParsers);

const serialize = createSerializer(rescheduleParsers);

export function rescheduleHref(
  token: string,
  values: Partial<RescheduleParams>,
): Route {
  return serialize(`/wizyta/${token}/przeloz`, values) as Route;
}

/** The week shown: asked for, or the chosen time's, or this one; never past. */
export function rescheduleWeek(params: RescheduleParams, today: string) {
  const current = mondayOf(today);
  const asked = mondayOf(
    params.tydzien ?? params.termin?.slice(0, 10) ?? today,
  );
  return asked < current ? current : asked;
}

export interface RescheduleView {
  picker: SlotPickerProps;
  /** The chosen time, when it is one of the free ones. */
  chosen: { value: string; label: string } | null;
}

export function buildRescheduleView({
  token,
  params,
  today,
  horizonDays,
  slots,
}: {
  token: string;
  params: RescheduleParams;
  /** Today where the centre is. */
  today: string;
  horizonDays: number;
  /** The week's free times the visit may move to. */
  slots: FreeSlot[];
}): RescheduleView {
  const current = mondayOf(today);
  const week = rescheduleWeek(params, today);
  const chosenSlot = params.termin
    ? slots.find((slot) => `${slot.date}T${slot.localTime}` === params.termin)
    : undefined;

  return {
    picker: {
      weekLabel: formatDateRange(week, addDays(week, 6)),
      previousHref:
        week > current
          ? rescheduleHref(token, { tydzien: addDays(week, -7) })
          : null,
      nextHref:
        addDays(week, 7) <= addDays(today, horizonDays)
          ? rescheduleHref(token, { tydzien: addDays(week, 7) })
          : null,
      days: weekOfSlots(
        week,
        slots,
        (value) => rescheduleHref(token, { tydzien: week, termin: value }),
        params.termin,
      ),
    },
    chosen: chosenSlot
      ? {
          value: `${chosenSlot.date}T${chosenSlot.localTime}`,
          label: `${formatWeekday(chosenSlot.date)}, ${formatDate(chosenSlot.date)}, godz. ${chosenSlot.localTime}`,
        }
      : null,
  };
}
