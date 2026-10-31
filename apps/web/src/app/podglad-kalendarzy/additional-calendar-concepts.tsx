"use client";

import { useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import type { SlotPickerDay, SlotPickerSlot } from "@repo/ui/booking";
import { HanddrawnLink } from "@repo/ui/public-site/handdrawn-link";
import {
  dateLabel,
  monthCells,
  monthStart,
  shiftMonth,
} from "./calendar-model";
import styles from "./preview.module.css";

export interface AdditionalCalendarProps {
  variant: number;
  name: string;
  service: string;
  detail: string;
  month: string;
  today: string;
  lastDay: string;
  days: SlotPickerDay[];
  status: "loading" | "ready" | "error";
  onMonth: (delta: number) => void;
  onRetry: () => void;
}
type TimeChoice = { date: string; slot: SlotPickerSlot };

/** Five compact adaptations, sharing the comparison page's live month data. */
export function AdditionalCalendarConcept({
  variant,
  name,
  service,
  detail,
  month,
  today,
  lastDay,
  days,
  status,
  onMonth,
  onRetry,
}: AdditionalCalendarProps) {
  const [chosenDate, setDate] = useState("");
  const [storedChoice, setChoice] = useState<TimeChoice | null>(null);
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [period, setPeriod] = useState("all");
  const available = days.filter((day) => day.slots.length);
  const selected =
    available.find((day) => day.date === chosenDate) ?? available[0];
  const choice =
    status === "ready" &&
    storedChoice &&
    days.some(
      (day) =>
        day.date === storedChoice.date &&
        day.slots.some((slot) => slot.href === storedChoice.slot.href),
    )
      ? storedChoice
      : null;
  const pageOffset = Math.min(
    offset,
    Math.max(0, Math.floor((available.length - 1) / 5) * 5),
  );
  const selectedIndex = available.findIndex(
    (day) => day.date === selected?.date,
  );
  const pickDate = (date: string) => {
    setDate(date);
    setChoice(null);
    if (variant !== 2) setOpen(false);
  };
  const pickTime = (day: SlotPickerDay, slot: SlotPickerSlot) => {
    setDate(day.date);
    setChoice({ date: day.date, slot });
  };
  const timeButton = (
    day: SlotPickerDay,
    slot: SlotPickerSlot,
    radio = false,
  ) => (
    <button
      type="button"
      key={slot.href}
      aria-label={`${dateLabel(day.date, { weekday: "long", day: "numeric", month: "long" })}, ${slot.time}, wolny termin`}
      aria-pressed={choice?.slot.href === slot.href}
      className={radio ? styles.radioTime : styles.smallTime}
      onClick={() => pickTime(day, slot)}
    >
      {radio ? (
        <span className={styles.radioCircle}>
          {choice?.slot.href === slot.href ? <Check size={10} /> : null}
        </span>
      ) : null}
      {slot.time}
    </button>
  );
  const monthHeader = (
    <div className={styles.monthHeader}>
      <h4>{dateLabel(month, { month: "long", year: "numeric" })}</h4>
      <div>
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          disabled={month <= monthStart(today)}
          onClick={() => onMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          aria-label="Następny miesiąc"
          disabled={shiftMonth(month, 1) > monthStart(lastDay)}
          onClick={() => onMonth(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
  const miniMonth = (
    <div className={styles.miniMonth} aria-label="Wybierz dzień miesiąca">
      <div className={styles.weekdays}>
        {["pn", "wt", "śr", "cz", "pt", "so", "nd"].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={styles.days}>
        {monthCells(month).map((date, index) =>
          date ? (
            <button
              type="button"
              key={date}
              disabled={
                status !== "ready" ||
                !available.some((day) => day.date === date)
              }
              aria-label={`${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}, wybierz dzień`}
              aria-pressed={selected?.date === date}
              aria-current={date === today ? "date" : undefined}
              title={date === today ? "Dzisiaj" : undefined}
              className={`${available.some((day) => day.date === date) ? styles.free : ""} ${date === today ? styles.today : ""}`}
              onClick={() => pickDate(date)}
            >
              {Number(date.slice(8))}
            </button>
          ) : (
            <span key={`empty-${index}`} />
          ),
        )}
      </div>
    </div>
  );
  const dateToggle = (
    <button
      type="button"
      className={styles.dateToggle}
      aria-expanded={open}
      onClick={() => setOpen((value) => !value)}
    >
      <CalendarDays size={17} />
      <span>
        {selected
          ? dateLabel(selected.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
          : "Wybierz dzień"}
      </span>
      <ChevronDown size={16} />
    </button>
  );
  const datePopup = open ? (
    <div className={styles.inlineMonth}>{miniMonth}</div>
  ) : null;
  const compactSlots = selected
    ? selected.slots.filter(
        (slot) =>
          period === "all" ||
          (period === "morning"
            ? slot.time < "12:00"
            : period === "afternoon"
              ? slot.time >= "12:00" && slot.time < "17:00"
              : slot.time >= "17:00"),
      )
    : [];
  const nearest = available
    .flatMap((day) => day.slots.map((slot) => ({ day, slot })))
    .slice(0, 3);

  return (
    <div
      className={`${styles.card} ${styles.extraCard} ${styles[`extraVariant${variant}`]}`}
      aria-label={`Wariant ${variant + 6}: ${["Acuity Scheduling", "SimplyBook.me", "Setmore", "Doodle", "Microsoft Bookings"][variant]}`}
    >
      <div className={styles.cardIntro}>
        <span className={styles.avatar}>
          {name
            .split(" ")
            .map((word) => word[0])
            .slice(0, 2)
            .join("")}
        </span>
        <div>
          <p>{name}</p>
          <h3>{service}</h3>
          <span>{detail}</span>
        </div>
      </div>
      {monthHeader}
      <div className={styles.feedback} role="status">
        {status === "loading" ? (
          "Sprawdzamy wolne terminy…"
        ) : status === "error" ? (
          <>
            Nie udało się odczytać terminów.{" "}
            <button onClick={onRetry}>Spróbuj ponownie</button>
          </>
        ) : !available.length ? (
          "Brak terminów w tym miesiącu. Sprawdź kolejny miesiąc."
        ) : (
          `${available.length} dni z wolnymi terminami`
        )}
      </div>

      {variant === 0 ? (
        <>
          <div className={styles.fiveDays}>
            {available.slice(pageOffset, pageOffset + 5).map((day) => (
              <div key={day.date}>
                <h4>
                  <span>{dateLabel(day.date, { weekday: "short" })}</span>
                  <strong>
                    {dateLabel(day.date, { day: "numeric", month: "short" })}
                  </strong>
                </h4>
                <div className={styles.fiveTimes}>
                  {day.slots.map((slot) => timeButton(day, slot))}
                </div>
              </div>
            ))}
          </div>
          <div className={styles.compactPager}>
            <button
              type="button"
              disabled={pageOffset === 0}
              onClick={() => setOffset(Math.max(0, pageOffset - 5))}
            >
              <ChevronLeft size={15} /> Wcześniejsze dni
            </button>
            <button
              type="button"
              disabled={pageOffset + 5 >= available.length}
              onClick={() => setOffset(pageOffset + 5)}
            >
              Kolejne dni <ChevronRight size={15} />
            </button>
          </div>
        </>
      ) : variant === 1 ? (
        <>
          <div className={styles.dateBar}>
            <button
              type="button"
              aria-label="Poprzedni dostępny dzień"
              disabled={selectedIndex <= 0}
              onClick={() => pickDate(available[selectedIndex - 1]!.date)}
            >
              <ChevronLeft size={17} />
            </button>
            {dateToggle}
            <button
              type="button"
              aria-label="Następny dostępny dzień"
              disabled={
                selectedIndex < 0 || selectedIndex >= available.length - 1
              }
              onClick={() => pickDate(available[selectedIndex + 1]!.date)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          {datePopup}
          <div className={styles.periods} aria-label="Pora dnia">
            {[
              { key: "all", label: "Cały dzień" },
              { key: "morning", label: "Rano" },
              { key: "afternoon", label: "Po południu" },
              { key: "evening", label: "Wieczorem" },
            ].map((one) => (
              <button
                type="button"
                key={one.key}
                aria-pressed={period === one.key}
                onClick={() => setPeriod(one.key)}
              >
                {one.label}
              </button>
            ))}
          </div>
          <div className={styles.compactSlots}>
            {selected
              ? compactSlots.map((slot) => timeButton(selected, slot))
              : null}
          </div>
          {selected && !compactSlots.length ? (
            <p className={styles.inlineHint}>
              Brak wolnych godzin o tej porze dnia. Zmień filtr powyżej.
            </p>
          ) : null}
        </>
      ) : variant === 2 ? (
        <>
          {!open ? (
            <div className={styles.nearestList}>
              {nearest.map(({ day, slot }, index) => (
                <button
                  type="button"
                  key={slot.href}
                  aria-pressed={choice?.slot.href === slot.href}
                  onClick={() => pickTime(day, slot)}
                >
                  <div>
                    <span>
                      {index === 0
                        ? "Najbliższy w tym miesiącu"
                        : "Kolejna propozycja"}
                    </span>
                    <strong>
                      {dateLabel(day.date, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </strong>
                  </div>
                  <b>{slot.time}</b>
                  <span className={styles.radioCircle}>
                    {choice?.slot.href === slot.href ? (
                      <Check size={11} />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.nearestCalendar}>
              {miniMonth}
              {selected ? (
                <div className={styles.compactSlots}>
                  {selected.slots.map((slot) => timeButton(selected, slot))}
                </div>
              ) : null}
            </div>
          )}
          <button
            type="button"
            className={styles.expandDates}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <CalendarDays size={15} />
            {open ? "Wróć do najbliższych propozycji" : "Poszukaj innej daty"}
            <ChevronDown size={14} />
          </button>
        </>
      ) : variant === 3 ? (
        <div className={styles.doodleBody}>
          {miniMonth}
          <div className={styles.radioList}>
            <h4>
              {selected
                ? dateLabel(selected.date, { day: "numeric", month: "short" })
                : "Godziny"}
            </h4>
            <div>
              {selected?.slots.map((slot) => timeButton(selected, slot, true))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.bookingForm}>
          <div>
            <p>
              <span>1</span> Data spotkania
            </p>
            {dateToggle}
            {datePopup}
          </div>
          <label>
            <span>
              <b>2</b> Godzina spotkania
            </span>
            <select
              aria-label="Godzina spotkania"
              disabled={!selected || status !== "ready"}
              value={choice?.slot.href ?? ""}
              onChange={(event) => {
                const slot = selected?.slots.find(
                  (one) => one.href === event.target.value,
                );
                if (selected && slot) pickTime(selected, slot);
              }}
            >
              <option value="">Wybierz godzinę</option>
              {selected?.slots.map((slot) => (
                <option key={slot.href} value={slot.href}>
                  {slot.time}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.formSummary}>
            Specjalista: <strong>{name}</strong>
            <br />
            {detail} · czas polski
          </p>
        </div>
      )}
      <footer className={styles.cardFooter}>
        {choice ? (
          <>
            <span>
              <Check size={15} />
              {dateLabel(choice.date, { day: "numeric", month: "long" })} ·{" "}
              {choice.slot.time}
            </span>
            <HanddrawnLink href={choice.slot.href}>
              Przejdź do rezerwacji
            </HanddrawnLink>
          </>
        ) : (
          <span>
            <Clock3 size={15} /> Wybierz dogodny termin
          </span>
        )}
      </footer>
    </div>
  );
}
