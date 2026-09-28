import { minutesToTime } from "@repo/scheduling";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Button } from "@repo/ui/button";
import { CalendarBlock, CalendarWeekGrid } from "@repo/ui/calendar";
import { Card } from "@repo/ui/card";
import {
  OccupancyRing,
  RoomScheduleBlockBody,
  ScheduleFigure,
} from "@repo/ui/room-schedule";
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { RoomScheduleViewModel } from "./schedule-view-model";
import { roomHref } from "./search-params";

const OUTSIDE = "Poza godzinami otwarcia";

function blocksLabel(count: number) {
  if (count === 1) return "1 blok";
  const few =
    count % 10 >= 2 &&
    count % 10 <= 4 &&
    (count % 100 < 12 || count % 100 > 14);
  return `${count} ${few ? "bloki" : "bloków"}`;
}

function WeekNav({
  roomId,
  model,
  today,
}: {
  roomId: string;
  model: RoomScheduleViewModel;
  today: string;
}) {
  const href = (week: string) =>
    roomHref(roomId, { zakladka: "grafik", tydzien: week }) as Route;
  return (
    <nav aria-label="Tydzień" className="flex items-center gap-1.5">
      <Button asChild size="icon" variant="secondary">
        <Link
          aria-label="Poprzedni tydzień"
          href={href(model.previousWeek)}
          scroll={false}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </Link>
      </Button>
      <Button asChild size="sm" variant="secondary">
        <Link href={href(today)} scroll={false}>
          Dziś
        </Link>
      </Button>
      <Button asChild size="icon" variant="secondary">
        <Link
          aria-label="Następny tydzień"
          href={href(model.nextWeek)}
          scroll={false}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      </Button>
    </nav>
  );
}

function Summary({
  roomId,
  model,
}: {
  roomId: string;
  model: RoomScheduleViewModel;
}) {
  const { summary } = model;
  return (
    <aside
      aria-label="Podsumowanie tygodnia"
      className="grid content-start gap-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] p-4 xl:border-t-0 xl:border-l"
    >
      <p className="text-[0.6875rem] font-bold tracking-wide text-[var(--text-muted)] uppercase">
        Podsumowanie tygodnia
      </p>
      <OccupancyRing
        detail={
          summary.hasHours
            ? `${summary.reservedLabel} z ${summary.openLabel} otwarcia`
            : "Ustaw godziny otwarcia, aby liczyć obłożenie"
        }
        label="Obłożenie gabinetu"
        note={
          summary.outsideCount
            ? `${blocksLabel(summary.outsideCount)} poza godzinami otwarcia`
            : undefined
        }
        percent={summary.percent}
      />
      <dl className="grid gap-2">
        <ScheduleFigure
          icon={<CalendarDays aria-hidden="true" className="size-4" />}
          label="Bloki specjalistów"
          value={summary.windowCount}
        />
        <ScheduleFigure
          icon={<CalendarClock aria-hidden="true" className="size-4" />}
          label="Zarezerwowane"
          value={summary.reservedLabel}
        />
        <ScheduleFigure
          icon={<Clock aria-hidden="true" className="size-4" />}
          label="Pozostało wolnych"
          value={summary.freeLabel ?? "–"}
        />
      </dl>

      <section aria-labelledby="room-specialists" className="grid gap-2">
        <h3
          className="text-[0.6875rem] font-bold tracking-wide text-[var(--text-muted)] uppercase"
          id="room-specialists"
        >
          Specjaliści w tym tygodniu
        </h3>
        {model.specialists.length ? (
          <ul className="grid gap-1.5">
            {model.specialists.map((person) => (
              <li
                className="flex items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                key={person.id}
              >
                <Avatar
                  className="size-7 ring-2 ring-[var(--block-accent)]"
                  style={{ "--block-accent": person.accent } as CSSProperties}
                >
                  {person.avatarUrl ? (
                    <AvatarImage alt="" src={person.avatarUrl} />
                  ) : null}
                  <AvatarFallback className="bg-[var(--surface)] text-[0.625rem] font-bold text-[var(--text)]">
                    {person.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--text)]">
                  {person.name}
                </span>
                <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
                  {person.hoursLabel}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Nikt nie ma tego gabinetu w tym tygodniu.
          </p>
        )}
      </section>

      {model.upcoming.length ? (
        <section aria-labelledby="room-upcoming" className="grid gap-2">
          <h3
            className="text-[0.6875rem] font-bold tracking-wide text-[var(--text-muted)] uppercase"
            id="room-upcoming"
          >
            Najbliższe dyżury
          </h3>
          <ul className="grid gap-1.5">
            {model.upcoming.map((one) => (
              <li
                className="rounded-[var(--radius-control)] border border-l-4 border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                key={one.id}
                style={{ borderLeftColor: one.accent }}
              >
                <p className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
                  {one.label}
                </p>
                <p className="font-semibold text-[var(--text)]">
                  {one.specialistName}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!summary.hasHours ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={roomHref(roomId, { zakladka: "godziny" }) as Route}>
            <Clock aria-hidden="true" className="size-4" />
            Ustaw godziny otwarcia
          </Link>
        </Button>
      ) : null}
    </aside>
  );
}

/** Gabinety → Grafik: who has the room when, week by week. */
export function RoomScheduleView({
  roomId,
  roomName,
  model,
  today,
}: {
  roomId: string;
  roomName: string;
  model: RoomScheduleViewModel;
  today: string;
}) {
  const { range } = model;
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3.5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
          <Building2
            aria-hidden="true"
            className="size-4 text-[var(--primary)]"
          />
          Tydzień gabinetu: {roomName} ({model.title})
        </h2>
        <WeekNav model={model} roomId={roomId} today={today} />
      </Card>

      <Card className="grid overflow-hidden p-0 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <CalendarWeekGrid
          className="min-w-0"
          columns={model.days.map((day) => ({
            key: day.date,
            label: day.label,
            sublabel: day.sublabel,
            isToday: day.isToday,
            ariaLabel: day.fullLabel,
            summary: (
              <span className="text-[0.625rem] font-medium text-[var(--text-muted)]">
                {day.openLabel ?? day.reservedLabel ?? " "}
              </span>
            ),
            content: (
              <>
                {day.closed.map((one) => (
                  <CalendarBlock
                    end={one.end}
                    key={`closed-${one.start}`}
                    label={`${one.label}, ${minutesToTime(one.start)}–${minutesToTime(one.end)}`}
                    range={range}
                    start={one.start}
                    variant="closed"
                  >
                    {one.end - one.start >= 60 ? one.label : null}
                  </CalendarBlock>
                ))}
                {day.windows.map((one) => (
                  <CalendarBlock
                    accent={one.accent}
                    end={one.end}
                    key={one.id}
                    label={`${one.specialistName}, ${one.timeLabel}. ${one.recurrenceLabel}${one.outsideHours ? `. ${OUTSIDE}` : ""}`}
                    range={range}
                    start={one.start}
                    tint={one.tint}
                  >
                    <RoomScheduleBlockBody
                      avatarUrl={one.avatarUrl}
                      initials={one.initials}
                      mode={one.mode}
                      name={one.specialistName}
                      timeLabel={one.timeLabel}
                      warning={one.outsideHours ? OUTSIDE : undefined}
                    />
                  </CalendarBlock>
                ))}
              </>
            ),
          }))}
          range={range}
        />
        <Summary model={model} roomId={roomId} />
      </Card>
    </div>
  );
}
