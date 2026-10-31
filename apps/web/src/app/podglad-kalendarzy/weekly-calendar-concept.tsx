"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import type { SlotPickerProps, SlotPickerSlot } from "@repo/ui/booking";
import { HanddrawnLink } from "@repo/ui/public-site/handdrawn-link";
import { dateLabel, monday, shiftDay } from "./calendar-model";
import styles from "./preview.module.css";

/** Read-only weekly comparison. Grey cells never claim another person booked. */
export function WeeklyCalendarConcept({
  query,
  name,
  service,
  detail,
  today,
  lastDay,
}: {
  query: string;
  name: string;
  service: string;
  detail: string;
  today: string;
  lastDay: string;
}) {
  const [week, setWeek] = useState(monday(today));
  const [retry, setRetry] = useState(0);
  const [choice, setChoice] = useState<{
    date: string;
    slot: SlotPickerSlot;
  } | null>(null);
  const key = `${query}|${week}|${retry}`;
  const [result, setResult] = useState<{
    key: string;
    picker: SlotPickerProps | null;
    error: boolean;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/booking/preview?${query}&tydzien=${week}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw Error("Availability unavailable");
        return response.json() as Promise<{ picker: SlotPickerProps }>;
      })
      .then(({ picker }) => {
        if (!controller.signal.aborted)
          setResult({ key, picker, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, picker: null, error: true });
      });
    return () => controller.abort();
  }, [query, week, retry, key]);
  const current = result?.key === key ? result : null;
  const dates = Array.from({ length: 7 }, (_, i) => shiftDay(week, i));
  const days = current?.picker?.days ?? [];
  // A consistent 08–20 comparison window, plus every returned free start time.
  const times = [
    ...new Set([
      ...Array.from(
        { length: 12 },
        (_, i) => `${String(i + 8).padStart(2, "0")}:00`,
      ),
      ...days.flatMap((day) => day.slots.map((slot) => slot.time)),
    ]),
  ].sort();
  const freeCount = days.reduce((count, day) => count + day.slots.length, 0);
  const move = (delta: number) => {
    setChoice(null);
    setWeek((value) => shiftDay(value, delta * 7));
  };
  return (
    <div
      className={`${styles.card} ${styles.weekCard}`}
      aria-label="Wariant 5: kompaktowy tydzień"
    >
      <div className={styles.cardIntro}>
        <span className={styles.avatar}>
          {name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <p>{name}</p>
          <h3>{service}</h3>
          <span>{detail}</span>
        </div>
      </div>
      <div className={styles.monthHeader}>
        <h4>
          {dateLabel(week, { day: "numeric", month: "short" })} –{" "}
          {dateLabel(shiftDay(week, 6), {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </h4>
        <div>
          <button
            type="button"
            aria-label="Poprzedni tydzień"
            disabled={week <= monday(today)}
            onClick={() => move(-1)}
          >
            <ChevronLeft size={19} />
          </button>
          <button
            type="button"
            aria-label="Następny tydzień"
            disabled={shiftDay(week, 7) > lastDay}
            onClick={() => move(1)}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
      <div className={styles.feedback} role="status">
        {!current ? (
          "Sprawdzamy wolne terminy…"
        ) : current.error ? (
          <>
            Nie udało się odczytać terminów.{" "}
            <button onClick={() => setRetry((value) => value + 1)}>
              Spróbuj ponownie
            </button>
          </>
        ) : freeCount ? (
          `${freeCount} wolnych terminów w tym tygodniu`
        ) : (
          "Brak wolnych terminów w tym tygodniu. Sprawdź kolejny tydzień."
        )}
      </div>
      <div className={styles.weekGrid} aria-busy={!current}>
        {dates.map((date) => (
          <div
            key={date}
            className={`${styles.weekDay} ${date < today || date > lastDay ? styles.pastDay : ""}`}
          >
            <h5>
              <span>{dateLabel(date, { weekday: "short" })}</span>
              <strong className={date === today ? styles.weekToday : ""}>
                {Number(date.slice(8))}
              </strong>
            </h5>
            {times.map((time) => {
              const slot =
                date >= today && date <= lastDay
                  ? days
                      .find((day) => day.date === date)
                      ?.slots.find((one) => one.time === time)
                  : undefined;
              const selected =
                choice?.date === date && choice.slot.time === time;
              return slot ? (
                <button
                  type="button"
                  key={time}
                  aria-label={`${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}, ${time}, wolny termin`}
                  aria-pressed={selected}
                  className={styles.weekFree}
                  onClick={() => setChoice({ date, slot })}
                >
                  {time}
                </button>
              ) : (
                <span
                  key={time}
                  className={styles.weekUnavailable}
                  aria-label={`${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}, ${time}, ${!current ? "sprawdzamy dostępność" : current.error ? "dostępność nieznana" : "niedostępne"}`}
                >
                  {current && !current.error ? time : "· · ·"}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.weekLegend}>
        <span>
          <i /> Wolne
        </span>
        <span>
          <i /> Niedostępne
        </span>
        <span>Godziny w czasie polskim</span>
      </div>
      <footer className={styles.cardFooter}>
        {choice ? (
          <>
            <span>
              <Check size={16} />
              {dateLabel(choice.date, { day: "numeric", month: "long" })} ·{" "}
              {choice.slot.time}
            </span>
            <HanddrawnLink href={choice.slot.href}>
              Przejdź do rezerwacji
            </HanddrawnLink>
          </>
        ) : (
          <span>
            <Clock3 size={15} /> Wybierz zieloną godzinę
          </span>
        )}
      </footer>
    </div>
  );
}
