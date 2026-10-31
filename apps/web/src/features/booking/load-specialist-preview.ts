import { z } from "zod";
import { toFreeSlots } from "@repo/scheduling";
import type { AvailabilityDay } from "@repo/ui/public-site/availability-calendar";
import {
  dateLabel,
  monday,
  shiftDay,
  shiftMonth,
} from "@repo/ui/public-site/availability-calendar-dates";
import { createPublicClient } from "@/lib/supabase/public";
import { bookingHref, type BookingParams } from "./search-params";

const availabilitySchema = z.object({
  timeZone: z.string(),
  today: z.string(),
  lastDay: z.string(),
  from: z.string(),
  to: z.string(),
  slots: z.array(
    z.object({
      startsAt: z.string(),
      options: z.array(
        z.object({
          service: z.string(),
          mode: z.enum(["online", "stacjonarnie"]),
          location: z.string(),
        }),
      ),
    }),
  ),
});

/** One read-only database call, regardless of the number of services or forms. */
export async function loadSpecialistPreview(
  params: BookingParams,
  nearest: boolean,
  month: string | null = null,
) {
  const from = month ?? params.tydzien;
  const to = month
    ? shiftDay(shiftMonth(month, 1), -1)
    : from
      ? shiftDay(from, 6)
      : null;
  const { data, error } = await createPublicClient().rpc(
    "specialist_availability",
    {
      p_specialist_slug: params.specjalista!,
      p_service_slug: params.usluga ?? undefined,
      p_nearest: nearest,
      p_from: from ?? undefined,
      p_to: to ?? undefined,
    },
  );
  if (error) throw error;
  const result = availabilitySchema.parse(data);
  const converted = toFreeSlots(
    result.slots.map((slot) => ({
      starts_at: slot.startsAt,
      ends_at: slot.startsAt,
    })),
    result.timeZone,
  );
  const days = new Map<string, AvailabilityDay>();
  for (let date = result.from; date <= result.to; date = shiftDay(date, 1)) {
    days.set(date, {
      date,
      weekday: dateLabel(date, { weekday: "short" }),
      label: dateLabel(date, { day: "numeric", month: "long" }),
      fullLabel: dateLabel(date, {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
      slots: [],
    });
  }
  result.slots.forEach((slot, i) => {
    const { date, localTime: time } = converted[i]!;
    const options = slot.options.map((option) => ({
      ...option,
      href: bookingHref({
        ...params,
        usluga: option.service,
        forma: option.mode,
        lokalizacja: option.location || null,
        tydzien: monday(date),
        termin: `${date}T${time}`,
        uwaga: null,
      }),
    }));
    if (options.length)
      days.get(date)?.slots.push({ time, href: options[0]!.href, options });
  });
  return {
    picker: { weekLabel: "", days: [...days.values()] },
    from: result.from,
    to: result.to,
  };
}
