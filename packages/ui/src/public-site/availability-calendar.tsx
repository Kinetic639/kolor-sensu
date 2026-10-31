"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { SlotPickerDay, SlotPickerSlot } from "../booking/slot-picker";
import { HanddrawnLink } from "./handdrawn-link";
import {
  dateLabel,
  monday,
  monthCells,
  monthStart,
  shiftDay,
  shiftMonth,
  workdayMonthCells,
} from "./availability-calendar-dates";
import styles from "./availability-calendar.module.css";

export type AvailabilityView = "week" | "month";
export interface AvailabilitySlotOption {
  service: string;
  mode: "online" | "stacjonarnie";
  location: string;
  href: string;
}
export interface AvailabilitySlot extends SlotPickerSlot {
  options?: AvailabilitySlotOption[];
}
export interface AvailabilityDay extends Omit<SlotPickerDay, "slots"> {
  slots: AvailabilitySlot[];
}
export interface AvailabilityChoice {
  date: string;
  slot: AvailabilitySlot;
}
export interface AvailabilityCalendarProps {
  view: AvailabilityView;
  month: string;
  week: string;
  today: string;
  lastDay: string;
  days: AvailabilityDay[];
  status: "loading" | "ready" | "error";
  skeletonRows?: number;
  onViewChange: (view: AvailabilityView) => void;
  onNavigate: (direction: number) => void;
  onRetry: () => void;
  onChoose?: (choice: AvailabilityChoice) => void;
}

/** Variant 11. Controlled availability; choosing a time never creates a hold. */
export function AvailabilityCalendar({
  view,
  month,
  week,
  today,
  lastDay,
  days,
  status,
  skeletonRows = 8,
  onViewChange,
  onNavigate,
  onRetry,
  onChoose,
}: AvailabilityCalendarProps) {
  const [chosenDay, setDay] = useState("");
  const [storedChoice, setChoice] = useState<{
    context: string;
    date: string;
    slot: AvailabilitySlot;
  } | null>(null);
  const context = `${view}|${month}|${week}`;
  const weekView = view === "week";
  const available = days.filter(
    (day) => day.slots.length && day.date >= today && day.date <= lastDay,
  );
  const chosen =
    available.find((day) => day.date === chosenDay) ?? available[0];
  const choice =
    status === "ready" &&
    storedChoice?.context === context &&
    available.some(
      (day) =>
        day.date === storedChoice.date &&
        day.slots.some((slot) => slot.href === storedChoice.slot.href),
    )
      ? storedChoice
      : null;
  const weekdaysOnly = !available.some((day) =>
    [0, 6].includes(new Date(`${day.date}T12:00:00Z`).getUTCDay()),
  );
  const cells = weekdaysOnly ? workdayMonthCells(month) : monthCells(month);
  const dates = Array.from({ length: 5 }, (_, i) => shiftDay(week, i));
  const pick = (day: AvailabilityDay, slot: AvailabilitySlot) => {
    setChoice({ context, date: day.date, slot });
    onChoose?.({ date: day.date, slot });
  };
  const previousDisabled = weekView
    ? week <= monday(today)
    : month <= monthStart(today);
  const nextDisabled = weekView
    ? shiftDay(week, 7) > lastDay
    : shiftMonth(month, 1) > monthStart(lastDay);
  const rows = Math.max(8, skeletonRows);
  return (
    <div className={styles.calendar} aria-label="Kalendarz dostępnych terminów">
      <div className={styles.header}>
        <div className={styles.views} aria-label="Widok kalendarza">
          {[
            { key: "month", label: "Miesiąc" },
            { key: "week", label: "Tydzień" },
          ].map((one) => (
            <button
              type="button"
              key={one.key}
              aria-pressed={view === one.key}
              onClick={() => {
                if (view !== one.key) {
                  setChoice(null);
                  onViewChange(one.key as AvailabilityView);
                }
              }}
            >
              {one.label}
            </button>
          ))}
        </div>
        <div className={styles.navigation}>
          <button
            type="button"
            aria-label={weekView ? "Poprzedni tydzień" : "Poprzedni miesiąc"}
            disabled={previousDisabled}
            onClick={() => {
              setChoice(null);
              onNavigate(-1);
            }}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <h4>
            {weekView
              ? `${dateLabel(week, { day: "numeric", month: "short" })} – ${dateLabel(shiftDay(week, 4), { day: "numeric", month: "short", year: "numeric" })}`
              : dateLabel(month, { month: "long", year: "numeric" })}
          </h4>
          <button
            type="button"
            aria-label={weekView ? "Następny tydzień" : "Następny miesiąc"}
            disabled={nextDisabled}
            onClick={() => {
              setChoice(null);
              onNavigate(1);
            }}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className={styles.stage} aria-busy={status === "loading"}>
        <div inert={status !== "ready" ? true : undefined}>
          <div
            className={styles.content}
            style={weekView ? { minHeight: rows * 37 + 50 } : undefined}
          >
            {status === "loading" ? (
              <div
                aria-hidden="true"
                className={weekView ? styles.weekSkeleton : styles.monthBody}
              >
                {weekView ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <div key={i}>
                      <span className={styles.skeletonHeading} />
                      {Array.from({ length: rows }, (_, j) => (
                        <span key={j} className={styles.skeletonSlot} />
                      ))}
                    </div>
                  ))
                ) : (
                  <>
                    <div
                      className={`${styles.skeletonGrid} ${weekdaysOnly ? styles.five : ""}`}
                    >
                      {cells.map((_, i) => (
                        <span key={i} />
                      ))}
                    </div>
                    <div className={styles.skeletonTimes}>
                      <span className={styles.skeletonHeading} />
                      {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} className={styles.skeletonSlot} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {!available.length ? (
                  <p className={styles.empty}>
                    Brak wolnych terminów. Zmień{" "}
                    {weekView ? "tydzień" : "miesiąc"} lub usługę.
                  </p>
                ) : null}
                {weekView ? (
                  <div className={styles.weekColumns}>
                    {dates.map((date) => {
                      const day = available.find((one) => one.date === date);
                      return (
                        <div key={date}>
                          <h4
                            className={
                              date === today ? styles.todayHeader : undefined
                            }
                            aria-current={date === today ? "date" : undefined}
                          >
                            <span>
                              {date === today
                                ? "Dzisiaj"
                                : dateLabel(date, { weekday: "short" })}
                            </span>
                            <strong>
                              {dateLabel(date, {
                                day: "numeric",
                                month: "short",
                              })}
                            </strong>
                          </h4>
                          <div>
                            {day?.slots.map((slot) => (
                              <button
                                type="button"
                                className={styles.time}
                                key={slot.href}
                                aria-label={`${day.fullLabel}, ${slot.time}, wolny termin`}
                                aria-pressed={choice?.slot.href === slot.href}
                                onClick={() => pick(day, slot)}
                              >
                                <span className={styles.timeLabel}>
                                  {slot.time}
                                </span>
                              </button>
                            ))}
                            {!day ? <p>Brak godzin</p> : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.monthBody}>
                    <div>
                      <div
                        className={`${styles.weekdays} ${weekdaysOnly ? styles.five : ""}`}
                      >
                        {(weekdaysOnly
                          ? ["pn", "wt", "śr", "cz", "pt"]
                          : ["pn", "wt", "śr", "cz", "pt", "so", "nd"]
                        ).map((label) => (
                          <span key={label}>{label}</span>
                        ))}
                      </div>
                      <div
                        className={`${styles.days} ${weekdaysOnly ? styles.five : ""}`}
                      >
                        {cells.map((date, i) => {
                          if (!date) return <span key={`empty-${i}`} />;
                          const day = available.find(
                            (one) => one.date === date,
                          );
                          return (
                            <button
                              type="button"
                              key={date}
                              disabled={!day}
                              aria-label={`${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}, ${day ? "wolne terminy" : "brak terminów"}`}
                              aria-current={date === today ? "date" : undefined}
                              aria-pressed={chosen?.date === date}
                              className={
                                date === today ? styles.today : undefined
                              }
                              onClick={() => {
                                setDay(date);
                                setChoice(null);
                              }}
                            >
                              {Number(date.slice(8))}
                              {day ? <i aria-hidden="true" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.dayTimes}>
                      <h4>
                        {chosen
                          ? dateLabel(chosen.date, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })
                          : "Wybierz dostępny dzień"}
                      </h4>
                      <div>
                        {chosen?.slots.map((slot) => (
                          <button
                            type="button"
                            className={styles.time}
                            key={slot.href}
                            aria-label={`${chosen.fullLabel}, ${slot.time}, wolny termin`}
                            aria-pressed={choice?.slot.href === slot.href}
                            onClick={() => pick(chosen, slot)}
                          >
                            <span className={styles.timeLabel}>
                              {slot.time}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          {choice && !onChoose ? (
            <footer className={styles.footer}>
              <span className={styles.chosen}>
                <Check size={14} aria-hidden="true" />
                {dateLabel(choice.date, {
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {choice.slot.time}
              </span>
              <HanddrawnLink href={choice.slot.href}>
                Przejdź do rezerwacji
              </HanddrawnLink>
            </footer>
          ) : null}
        </div>
        {status !== "ready" ? (
          <div
            className={styles.overlay}
            role={status === "error" ? "alert" : "status"}
          >
            {status === "loading" ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                <strong>Sprawdzamy wolne terminy…</strong>
              </>
            ) : (
              <>
                <strong>Nie udało się pobrać terminów</strong>
                <button type="button" onClick={onRetry}>
                  Spróbuj ponownie
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
