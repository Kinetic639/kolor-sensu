"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";
import type {
  SlotPickerDay,
  SlotPickerProps,
  SlotPickerSlot,
} from "@repo/ui/booking";
import { HanddrawnLink } from "@repo/ui/public-site/handdrawn-link";
import {
  dateLabel,
  monday,
  monthCells,
  workdayMonthCells,
  monthStart,
  monthWeeks,
  shiftDay,
  shiftMonth,
} from "./calendar-model";
import styles from "./preview.module.css";
import { WeeklyCalendarConcept } from "./weekly-calendar-concept";
import { AdditionalCalendarConcept } from "./additional-calendar-concepts";
import { ChosenCalendarPreview } from "./chosen-calendar-preview";

type Choice = { slug: string; name: string };
type Offer = {
  specialist: string;
  service: string;
  detail: string;
  inPerson: boolean;
  online: boolean;
};
export interface CalendarLabProps {
  today: string;
  horizonDays: number;
  timeZone: string;
  specialists: Choice[];
  services: Choice[];
  locations: Choice[];
  offers: Offer[];
}
const concepts = [
  {
    name: "Miesiąc + godziny obok",
    inspiration: "Calendly",
    tag: "Najbardziej znajomy",
    description:
      "Cały miesiąc pozostaje widoczny. Po wybraniu dnia godziny pojawiają się w osobnej kolumnie. Dobry do szerszego panelu obok profilu.",
    source: "https://calendly.com/blog/getting-started-guide",
  },
  {
    name: "Kompaktowy miesiąc",
    inspiration: "TidyCal",
    tag: "Najmniej miejsca",
    description:
      "Prosty kalendarz, a pod nim godziny wybranego dnia. Wąski wariant do sekcji zespołu; dobrze mieści się również na telefonie.",
    source: "https://help.tidycal.com/article/686-booking-type",
  },
  {
    name: "Miesiąc lub kolumny dni",
    inspiration: "Cal.com",
    tag: "Porównywanie terminów",
    description:
      "Przełączasz widok miesiąca na trzy kolumny z godzinami. Łatwo porównać kilka dni bez klikania każdego z osobna.",
    source:
      "https://cal.com/blog/enhanced-flexibility-take-advantage-of-cal-com-s-multiple-booking-layouts",
  },
  {
    name: "Miesiąc → spokojna agenda",
    inspiration: "YouCanBookMe + własna adaptacja",
    tag: "Jeden wybór naraz",
    description:
      "Najpierw wybierasz dzień w miesiącu, potem widzisz większe godziny podzielone na pory dnia. Przycisk powrotu zachowuje wybrany miesiąc.",
    source:
      "https://support.youcanbook.me/hc/en-us/articles/17321284842775-Let-users-book-in-advance-with-the-View-Month-layout",
  },
  {
    name: "Cały tydzień w kompaktowych kolumnach",
    inspiration: "Własna propozycja · tydzień",
    tag: "Siedem dni na jednym widoku",
    description:
      "Wszystkie dni tygodnia obok siebie, bez przewijania w bok. Zielone godziny są dostępne, a szare przekreślone pola pokazują niedostępność. Strzałkami przechodzisz między tygodniami.",
    source: null,
  },
  {
    name: "Pięć kolejnych dostępnych dni",
    inspiration: "Acuity Scheduling",
    tag: "Szybkie porównanie dni",
    description:
      "Inspiracja szablonem Daily: pięć dni z wolnymi terminami i godziny pod każdym z nich. Pomijamy dni bez dostępności. Kolejne dni przeglądasz bez rozkładania pełnego miesiąca.",
    source:
      "https://help.acuityscheduling.com/hc/en-us/articles/16676870180237-Choosing-scheduler-templates",
  },
  {
    name: "Data w nagłówku, godziny pod ręką",
    inspiration: "SimplyBook.me",
    tag: "Kalendarz schowany do kliknięcia",
    description:
      "Inspiracja Inline datepicker: miesiąc pojawia się dopiero po kliknięciu daty. Na co dzień widać zwięzły pasek daty i godziny. Dodaliśmy własny filtr pory dnia.",
    source:
      "https://help.simplybook.me/wiki/How_to_change_the_way_time_slots_are_shown",
  },
  {
    name: "Najbliższy termin od razu",
    inspiration: "Setmore",
    tag: "Najkrótsza droga do wyboru",
    description:
      "Inspiracja funkcją First Available Appointment: od razu pokazujemy pierwszą dostępną godzinę w przeglądanym miesiącu i dwie kolejne propozycje. Pełny miesiąc rozwijasz, gdy chcesz poszukać innej daty.",
    source:
      "https://support.setmore.com/en/articles/1230114-advance-to-first-available-appointment-setup-how-it-works",
  },
  {
    name: "Mini miesiąc i lista godzin",
    inspiration: "Doodle",
    tag: "Mały widok, wyraźny wybór",
    description:
      "Inspiracja wyborem podświetlonego dnia i godziny z listy: zmniejszyliśmy miesiąc, a godziny mają formę listy z pojedynczym zaznaczeniem. Obie części pozostają obok siebie także na telefonie.",
    source:
      "https://help.doodle.com/en/articles/9716984-how-do-i-participate-in-a-booking-page",
  },
  {
    name: "Data i godzina jak w formularzu",
    inspiration: "Microsoft Bookings",
    tag: "Najbardziej oszczędna forma",
    description:
      "Własna adaptacja procesu wyboru usługi, daty i godziny z Bookings. Dwa czytelne pola i podsumowanie. Miesiąc rozwija się wewnątrz pola daty, a godziny wybierasz z listy.",
    source:
      "https://learn.microsoft.com/en-us/microsoft-365/bookings/bookings-faq",
  },
  {
    name: "Kompaktowy tydzień: poniedziałek–piątek",
    inspiration: "Cal.com · własna adaptacja",
    tag: "Pięć kolumn z wolnymi godzinami",
    description:
      "Wariant 3 w bardziej zwartej formie: kolumny od poniedziałku do piątku i tylko dostępne godziny. Tygodnie zmieniasz strzałkami. Nadal możesz przełączyć się na pełny miesiąc, również z weekendami.",
    source:
      "https://cal.com/blog/enhanced-flexibility-take-advantage-of-cal-com-s-multiple-booking-layouts",
  },
];

export function CalendarLab({
  today,
  horizonDays,
  timeZone,
  specialists,
  services,
  locations,
  offers,
}: CalendarLabProps) {
  const [specialist, setSpecialist] = useState(specialists[0]?.slug ?? "");
  const available = services.filter((one) =>
    offers.some(
      (offer) => offer.specialist === specialist && offer.service === one.slug,
    ),
  );
  const [serviceChoice, setService] = useState("");
  const service =
    available.find((one) => one.slug === serviceChoice) ?? available[0];
  const offer = offers.find(
    (one) => one.specialist === specialist && one.service === service?.slug,
  );
  const [modeChoice, setMode] = useState("stacjonarnie");
  const mode =
    modeChoice === "stacjonarnie" && offer?.inPerson && locations.length
      ? "stacjonarnie"
      : offer?.online
        ? "online"
        : "stacjonarnie";
  const [location, setLocation] = useState(locations[0]?.slug ?? "");
  const [month, setMonth] = useState(monthStart(today));
  const [retry, setRetry] = useState(0);
  const lastDay = shiftDay(today, horizonDays);
  const query = new URLSearchParams({
    specjalista: specialist,
    usluga: service?.slug ?? "",
    forma: mode,
    ...(mode === "stacjonarnie" ? { lokalizacja: location } : {}),
  }).toString();
  const key = `${query}|${month}|${retry}`;
  const [result, setResult] = useState<{
    key: string;
    days: SlotPickerDay[];
    error: boolean;
  } | null>(null);
  useEffect(() => {
    if (!service) return;
    const controller = new AbortController();
    // Monthly concepts share reads; no holds or bookings are created here.
    void Promise.all(
      monthWeeks(month, today, lastDay).map(async (week) => {
        const response = await fetch(
          `/api/booking/preview?${query}&tydzien=${week}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw Error("Availability unavailable");
        const data = (await response.json()) as { picker: SlotPickerProps };
        return data.picker.days;
      }),
    )
      .then((weeks) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            days: weeks
              .flat()
              .filter(
                (day) =>
                  day.date.startsWith(month.slice(0, 7)) &&
                  day.date >= today &&
                  day.date <= lastDay,
              ),
            error: false,
          });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResult({ key, days: [], error: true });
      });
    return () => controller.abort();
  }, [key, query, month, today, lastDay, service]);
  const current = result?.key === key ? result : null;
  const name =
    specialists.find((one) => one.slug === specialist)?.name ?? "Specjalista";
  const changeMonth = (delta: number) =>
    setMonth((value) => shiftMonth(value, delta));
  return (
    <div className={styles.lab}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>PRACOWNIA POMYSŁÓW · UMAWIANIE WIZYT</p>
        <h1>
          Znajdźmy kalendarz,
          <br />
          <em>w którym jest Ci wygodnie.</em>
        </h1>
        <p>
          Jedenaście działających propozycji, te same prawdziwe terminy z DEV.
          Wybierz usługę, przełącz miesiąc lub tydzień i sprawdź, który sposób
          przeglądania jest dla Ciebie najbardziej naturalny.
        </p>
        <nav className={styles.anchors} aria-label="Warianty kalendarza">
          {concepts.map((one, i) => (
            <a key={one.name} href={`#wariant-${i + 1}`}>
              {String(i + 1).padStart(2, "0")} ·{" "}
              {one.inspiration.split(" +")[0]}
            </a>
          ))}
        </nav>
        <button className={styles.printButton} onClick={() => window.print()}>
          Drukuj / zapisz propozycje jako PDF
        </button>
      </header>
      <section
        className={styles.filters}
        aria-label="Wspólne ustawienia podglądów"
      >
        <label>
          Specjalista
          <select
            value={specialist}
            onChange={(event) => setSpecialist(event.target.value)}
          >
            {specialists.map((one) => (
              <option key={one.slug} value={one.slug}>
                {one.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Usługa
          <select
            value={service?.slug ?? ""}
            onChange={(event) => setService(event.target.value)}
          >
            {available.map((one) => (
              <option key={one.slug} value={one.slug}>
                {one.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Forma spotkania
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            {offer?.inPerson && locations.length ? (
              <option value="stacjonarnie">W gabinecie</option>
            ) : null}
            {offer?.online ? <option value="online">Online</option> : null}
          </select>
        </label>
        {mode === "stacjonarnie" ? (
          <label>
            Lokalizacja
            <select
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              {locations.map((one) => (
                <option key={one.slug} value={one.slug}>
                  {one.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p>
          <Clock3 size={15} /> {offer?.detail}{" "}
          <span>
            Godziny: {timeZone} · dostępność do{" "}
            {dateLabel(lastDay, { day: "numeric", month: "long" })}
          </span>
        </p>
      </section>
      {!service ? (
        <p role="status">Brak usług dostępnych do rezerwacji.</p>
      ) : (
        concepts.map((concept, index) => (
          <section
            key={concept.name}
            id={`wariant-${index + 1}`}
            className={styles.scene}
          >
            <div className={styles.copy}>
              <span className={styles.number}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className={styles.eyebrow}>
                INSPIRACJA: {concept.inspiration}
              </p>
              <h2>{concept.name}</h2>
              <span className={styles.tag}>{concept.tag}</span>
              <p>{concept.description}</p>
              {concept.source ? (
                <a
                  href={concept.source}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.source}
                >
                  Zobacz źródło inspiracji ↗
                </a>
              ) : (
                <p className={styles.source}>
                  Brak terminu nie oznacza wyłącznie zajętej wizyty — może to
                  być też czas poza grafikiem.
                </p>
              )}
            </div>
            {index === 10 ? (
              <ChosenCalendarPreview
                key={query}
                query={query}
                name={name}
                service={service.name}
                detail={offer?.detail ?? ""}
                today={today}
                lastDay={lastDay}
              />
            ) : index >= 5 && index < 10 ? (
              <AdditionalCalendarConcept
                key={`${index}|${query}`}
                variant={index - 5}
                name={name}
                service={service.name}
                detail={offer?.detail ?? ""}
                month={month}
                today={today}
                lastDay={lastDay}
                days={current?.days ?? []}
                status={
                  !current ? "loading" : current.error ? "error" : "ready"
                }
                onMonth={changeMonth}
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : index === 4 ? (
              <WeeklyCalendarConcept
                key={query}
                query={query}
                name={name}
                service={service.name}
                detail={offer?.detail ?? ""}
                today={today}
                lastDay={lastDay}
              />
            ) : (
              <CalendarConcept
                query={query}
                key={index === 10 ? `${index}|${query}` : `${index}|${key}`}
                variant={index}
                name={name}
                service={service.name}
                detail={offer?.detail ?? ""}
                month={month}
                today={today}
                lastDay={lastDay}
                days={current?.days ?? []}
                status={
                  !current ? "loading" : current.error ? "error" : "ready"
                }
                onMonth={changeMonth}
                onRetry={() => setRetry((value) => value + 1)}
              />
            )}
          </section>
        ))
      )}
      <aside className={styles.note}>
        <strong>To są autorskie adaptacje, nie osadzone aplikacje.</strong>{" "}
        Porównujemy sposoby wyboru terminu, zachowując styl strony. Kliknięcie
        godziny zaznacza ją w podglądzie; dopiero „Przejdź do rezerwacji”
        otwiera istniejący formularz. Sam podgląd nie rezerwuje wizyty.
      </aside>
    </div>
  );
}

type ConceptProps = {
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
  query?: string;
};

function CalendarConcept({
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
  query,
}: ConceptProps) {
  const [chosen, setChosen] = useState("");
  const [slot, setSlot] = useState<SlotPickerSlot | null>(null);
  const [agenda, setAgenda] = useState(false);
  const [columns, setColumns] = useState(variant === 10);
  const [columnOffset, setColumnOffset] = useState(0);
  const [week, setWeek] = useState(monday(today));
  const [weekRetry, setWeekRetry] = useState(0);
  const [weekResult, setWeekResult] = useState<{
    key: string;
    days: SlotPickerDay[];
    error: boolean;
  } | null>(null);
  const weekKey = `${query}|${week}|${weekRetry}`;
  const workweek = variant === 10 && columns;
  useEffect(() => {
    if (!workweek || !query) return;
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
          setWeekResult({ key: weekKey, days: picker.days, error: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setWeekResult({ key: weekKey, days: [], error: true });
      });
    return () => controller.abort();
  }, [workweek, query, week, weekKey]);
  const currentWeek = weekResult?.key === weekKey ? weekResult : null;
  const viewStatus = workweek
    ? !currentWeek
      ? "loading"
      : currentWeek.error
        ? "error"
        : "ready"
    : status;
  const visibleDays = workweek
    ? (currentWeek?.days.filter(
        (day) => day.date >= week && day.date <= shiftDay(week, 4),
      ) ?? [])
    : days;
  const available = visibleDays.filter((day) => day.slots.length);
  const selected = available.find((day) => day.date === chosen) ?? available[0];
  const activeDay = selected?.date;
  const weekdaysOnly =
    variant === 10 &&
    !days.some(
      (day) =>
        day.slots.length &&
        [0, 6].includes(new Date(`${day.date}T12:00:00Z`).getUTCDay()),
    );
  const monthDates = weekdaysOnly
    ? workdayMonthCells(month)
    : monthCells(month);
  const pick = (date: string) => {
    setChosen(date);
    setSlot(null);
    if (variant === 3) setAgenda(true);
  };
  const monthTitle = dateLabel(month, { month: "long", year: "numeric" });
  const header = (
    <div className={styles.monthHeader}>
      <h4>{monthTitle}</h4>
      <div>
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          disabled={month <= monthStart(today)}
          onClick={() => {
            setSlot(null);
            onMonth(-1);
          }}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          type="button"
          aria-label="Następny miesiąc"
          disabled={shiftMonth(month, 1) > monthStart(lastDay)}
          onClick={() => {
            setSlot(null);
            onMonth(1);
          }}
        >
          <ChevronRight size={19} />
        </button>
      </div>
    </div>
  );
  const calendar = (
    <div
      className={`${styles.calendar} ${weekdaysOnly ? styles.weekdayMonth : ""}`}
    >
      {variant !== 10 ? header : null}
      <div className={styles.weekdays}>
        {(weekdaysOnly
          ? ["pn", "wt", "śr", "cz", "pt"]
          : ["pn", "wt", "śr", "cz", "pt", "so", "nd"]
        ).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={styles.days}>
        {monthDates.map((date, i) => {
          if (!date) return <span key={`empty-${i}`} />;
          const day = available.find((one) => one.date === date);
          return (
            <button
              type="button"
              key={date}
              disabled={status !== "ready" || !day}
              aria-pressed={activeDay === date}
              aria-current={date === today ? "date" : undefined}
              title={date === today ? "Dzisiaj" : undefined}
              aria-label={`${dateLabel(date, { weekday: "long", day: "numeric", month: "long" })}${day ? `, ${day.slots.length} wolnych terminów` : ", brak terminów"}`}
              className={`${day ? styles.free : ""} ${date === today ? styles.today : ""}`}
              onClick={() => pick(date)}
            >
              {Number(date.slice(8))}
              {day ? <span className={styles.dot} /> : null}
            </button>
          );
        })}
      </div>
      {variant !== 10 ? (
        <p className={styles.legend}>
          <i /> Wolne terminy <span>· szare dni niedostępne</span>
        </p>
      ) : null}
    </div>
  );
  const times = (day: SlotPickerDay | undefined, grouped = false) => (
    <div className={styles.timePanel}>
      <h4>
        {day
          ? dateLabel(day.date, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })
          : "Wybierz dostępny dzień"}
      </h4>
      {day
        ? (grouped
            ? [
                {
                  label: "Przed południem",
                  slots: day.slots.filter((one) => one.time < "12:00"),
                },
                {
                  label: "Po południu",
                  slots: day.slots.filter(
                    (one) => one.time >= "12:00" && one.time < "17:00",
                  ),
                },
                {
                  label: "Wieczorem",
                  slots: day.slots.filter((one) => one.time >= "17:00"),
                },
              ]
            : [{ label: "Dostępne godziny", slots: day.slots }]
          )
            .filter((group) => group.slots.length)
            .map((group) => (
              <div key={group.label} className={styles.timeGroup}>
                {variant !== 10 || grouped ? <p>{group.label}</p> : null}
                <div className={styles.times}>
                  {group.slots.map((one) => (
                    <button
                      key={one.href}
                      type="button"
                      aria-pressed={slot?.href === one.href}
                      onClick={() => setSlot(one)}
                    >
                      {one.time}
                      {slot?.href === one.href ? <Check size={14} /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ))
        : null}
    </div>
  );
  const viewToggle =
    variant === 2 || variant === 10 ? (
      <div className={styles.viewSwitch} aria-label="Widok kalendarza">
        <button
          aria-pressed={!columns}
          onClick={() => {
            if (!columns) return;
            setSlot(null);
            setColumns(false);
          }}
        >
          Miesiąc
        </button>
        <button
          aria-pressed={columns}
          onClick={() => {
            if (columns) return;
            setSlot(null);
            if (variant === 10) setWeekResult(null);
            setColumns(true);
          }}
        >
          {variant === 10 ? "Tydzień" : "Kolumny dni"}
        </button>
      </div>
    ) : null;
  const workweekSkeletonRows = Math.max(
    8,
    ...(weekResult?.days ?? []).map((day) => day.slots.length),
  );
  const loadingSkeleton = (
    <div className={styles.calendarSkeleton} aria-hidden="true">
      {workweek ? (
        <div className={styles.workweekSkeleton}>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i}>
              <span className={styles.skeletonHeading} />
              {Array.from({ length: workweekSkeletonRows }, (_, j) => (
                <span className={styles.skeletonSlot} key={j} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`${styles.monthSkeleton} ${weekdaysOnly ? styles.weekdayMonth : ""}`}
        >
          <div className={styles.monthSkeletonGrid}>
            {Array.from({ length: monthDates.length }, (_, i) => (
              <span key={i} />
            ))}
          </div>
          <div className={styles.timeSkeleton}>
            <span className={styles.skeletonHeading} />
            {Array.from({ length: 8 }, (_, i) => (
              <span className={styles.skeletonSlot} key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
  return (
    <div
      className={`${styles.card} ${styles[`variant${variant}`]}`}
      aria-label={`Wariant ${variant + 1}: ${concepts[variant]!.name}`}
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
      {variant === 10 ? (
        <div className={styles.workweekToolbar}>
          {viewToggle}
          <div className={styles.weekNavigation}>
            <button
              type="button"
              aria-label={workweek ? "Poprzedni tydzień" : "Poprzedni miesiąc"}
              disabled={
                workweek ? week <= monday(today) : month <= monthStart(today)
              }
              onClick={() => {
                setSlot(null);
                if (workweek) setWeek((value) => shiftDay(value, -7));
                else onMonth(-1);
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <h4>
              {workweek ? (
                <>
                  {" "}
                  {dateLabel(week, { day: "numeric", month: "short" })} –{" "}
                  {dateLabel(shiftDay(week, 4), {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                </>
              ) : (
                monthTitle
              )}
            </h4>

            <button
              type="button"
              aria-label={workweek ? "Następny tydzień" : "Następny miesiąc"}
              disabled={
                workweek
                  ? shiftDay(week, 7) > lastDay
                  : shiftMonth(month, 1) > monthStart(lastDay)
              }
              onClick={() => {
                setSlot(null);
                if (workweek) setWeek((value) => shiftDay(value, 7));
                else onMonth(1);
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : !workweek ? (
        viewToggle
      ) : null}
      {variant !== 10 &&
      (!workweek || viewStatus !== "ready" || !available.length) ? (
        <div className={styles.feedback} role="status">
          {viewStatus === "loading" ? (
            "Sprawdzamy wolne terminy…"
          ) : viewStatus === "error" ? (
            <span>
              Nie udało się odczytać terminów.{" "}
              <button
                onClick={
                  workweek ? () => setWeekRetry((value) => value + 1) : onRetry
                }
              >
                Spróbuj ponownie
              </button>
            </span>
          ) : !available.length ? (
            workweek ? (
              "Brak wolnych terminów od poniedziałku do piątku. Sprawdź kolejny tydzień lub widok miesiąca."
            ) : (
              "Brak wolnych terminów w tym miesiącu. Sprawdź następny miesiąc lub inną usługę."
            )
          ) : (
            `${available.length} dni z wolnymi terminami ${workweek ? "od poniedziałku do piątku" : "w tym miesiącu"}`
          )}
        </div>
      ) : null}
      <div
        className={variant === 10 ? styles.calendarStage : undefined}
        aria-busy={variant === 10 && viewStatus === "loading"}
      >
        <div
          inert={variant === 10 && viewStatus !== "ready" ? true : undefined}
        >
          <div
            className={variant === 10 ? styles.calendarContent : undefined}
            style={
              variant === 10 && workweek
                ? { minHeight: workweekSkeletonRows * 37 + 70 }
                : undefined
            }
          >
            {variant === 10 && viewStatus === "loading" ? (
              loadingSkeleton
            ) : (
              <>
                {variant === 10 &&
                viewStatus === "ready" &&
                !available.length ? (
                  <p className={styles.emptyCalendar}>
                    Brak wolnych terminów. Zmień{" "}
                    {workweek ? "tydzień" : "miesiąc"} lub usługę.
                  </p>
                ) : null}
                {workweek ? (
                  <>
                    <div className={styles.workweekColumns}>
                      {Array.from({ length: 5 }, (_, i) =>
                        shiftDay(week, i),
                      ).map((date) => {
                        const day = available.find((one) => one.date === date);
                        return (
                          <div key={date}>
                            <h4
                              className={
                                date === today
                                  ? styles.workweekToday
                                  : undefined
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
                              {day?.slots.map((one) => (
                                <button
                                  type="button"
                                  className={styles.smallTime}
                                  key={one.href}
                                  aria-label={`${day.fullLabel}, ${one.time}, wolny termin`}
                                  aria-pressed={slot?.href === one.href}
                                  onClick={() => {
                                    setChosen(date);
                                    setSlot(one);
                                  }}
                                >
                                  {one.time}
                                </button>
                              ))}
                              {!day ? (
                                <p>
                                  {viewStatus === "loading"
                                    ? "…"
                                    : viewStatus === "error"
                                      ? "—"
                                      : "Brak godzin"}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : variant === 2 && columns ? (
                  <>
                    {header}
                    <div className={styles.columnNav}>
                      <button
                        disabled={columnOffset === 0}
                        onClick={() =>
                          setColumnOffset((value) => Math.max(0, value - 3))
                        }
                      >
                        <ArrowLeft size={15} /> Wcześniejsze dni
                      </button>
                      <button
                        disabled={columnOffset + 3 >= available.length}
                        onClick={() => setColumnOffset((value) => value + 3)}
                      >
                        Kolejne dni <ArrowRight size={15} />
                      </button>
                    </div>
                    <div className={styles.columns}>
                      {available
                        .slice(columnOffset, columnOffset + 3)
                        .map((day) => (
                          <div key={day.date}>{times(day)}</div>
                        ))}
                    </div>
                  </>
                ) : variant === 3 && agenda ? (
                  <div className={styles.agenda}>
                    <button
                      className={styles.back}
                      onClick={() => {
                        setAgenda(false);
                        setSlot(null);
                      }}
                    >
                      <ArrowLeft size={16} /> Wróć do miesiąca
                    </button>
                    {times(selected, true)}
                  </div>
                ) : (
                  <div className={styles.bookingBody}>
                    {calendar}
                    {variant === 3 ? (
                      <div className={styles.stepHint}>
                        <CalendarDays size={18} /> Wybierz dzień, aby zobaczyć
                        godziny.
                      </div>
                    ) : (
                      times(selected)
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <footer className={styles.cardFooter}>
            {variant === 10 ? (
              <p className={`${styles.legend} ${styles.separatedLegend}`}>
                <span>
                  <i aria-hidden="true" />
                  Wolne terminy
                </span>
                <span>
                  <i aria-hidden="true" />
                  Dni niedostępne
                </span>
              </p>
            ) : null}
            {slot ? (
              <>
                <span>
                  <Check size={16} />{" "}
                  {selected && variant !== 2 && variant !== 10
                    ? dateLabel(selected.date, {
                        day: "numeric",
                        month: "long",
                      })
                    : new URL(slot.href, "http://booking.local").searchParams
                        .get("termin")
                        ?.slice(0, 10)}{" "}
                  · {slot.time}
                </span>
                <HanddrawnLink href={slot.href}>
                  Przejdź do rezerwacji
                </HanddrawnLink>
              </>
            ) : variant !== 10 ? (
              <span>
                <Clock3 size={15} /> Czas polski · wybierz dogodny termin
              </span>
            ) : null}
          </footer>
        </div>
        {variant === 10 && viewStatus !== "ready" ? (
          <div
            className={styles.loadingOverlay}
            role={viewStatus === "error" ? "alert" : "status"}
          >
            {viewStatus === "loading" ? (
              <>
                <span className={styles.loadingSpinner} aria-hidden="true" />
                <strong>Sprawdzamy wolne terminy…</strong>
              </>
            ) : (
              <>
                <strong>Nie udało się pobrać terminów</strong>
                <button
                  type="button"
                  onClick={
                    workweek
                      ? () => setWeekRetry((value) => value + 1)
                      : onRetry
                  }
                >
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
