import type { CompactBookingCalendarProps } from "./compact-booking-calendar";
import type { AvailabilityCalendarProps } from "./availability-calendar";
export const compactBookingSample: Omit<
  CompactBookingCalendarProps,
  "onChange"
> = {
  specialistName: "Anna Nowak",
  services: [
    {
      slug: "konsultacja",
      name: "Konsultacja psychologiczna",
      detail: "50 min · 210 zł",
      price: "210 zł",
      duration: "50 min",
      description:
        "Pierwsza rozmowa o Twojej sytuacji i potrzebach. Wspólnie ustalimy dalszą formę wsparcia.",
      modes: ["stacjonarnie", "online"],
    },
    {
      slug: "wsparcie",
      name: "Spotkanie wspierające",
      detail: "50 min · 190 zł",
      price: "190 zł",
      duration: "50 min",
      description:
        "Wsparcie w trudnym momencie, w bezpiecznej i spokojnej atmosferze.",
      modes: ["online"],
    },
  ],
  locations: [{ slug: "centrum", name: "Kolor Sensu" }],
  selection: {
    service: "konsultacja",
    mode: "stacjonarnie",
    location: "centrum",
  },
  calendar: null,
};
export const availabilityCalendarSample: Omit<
  AvailabilityCalendarProps,
  "onViewChange" | "onNavigate" | "onRetry"
> = {
  view: "week",
  week: "2030-01-07",
  month: "2030-01-01",
  today: "2030-01-07",
  lastDay: "2030-03-08",
  status: "ready",
  days: ["Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob.", "Niedz."].map(
    (weekday, i) => {
      const date = "2030-01-" + String(i + 7).padStart(2, "0");
      return {
        date,
        weekday,
        label: i + 7 + " stycznia",
        fullLabel: weekday + " " + (i + 7) + " stycznia",
        slots:
          i < 3
            ? (i === 0
                ? [
                    "09:00",
                    "10:00",
                    "11:00",
                    "12:00",
                    "14:00",
                    "15:00",
                    "16:00",
                  ]
                : ["13:00", "17:00"]
              ).map((time) => ({
                time,
                href:
                  "/umow-wizyte?usluga=konsultacja&specjalista=anna-nowak&forma=online&termin=" +
                  date +
                  "T" +
                  time,
              }))
            : [],
      };
    },
  ),
};
