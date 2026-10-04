import {
  initialsOf,
  visitsLabel,
  type RoomDay,
  type RoomToday,
  type RoomUser,
} from "@repo/scheduling";
import { hoursShort } from "../calendar-view/schedule-parts";
import { ROW_LINE } from "../detail-page/detail-page";
import { cn } from "../lib/utils";
import { resourceColors } from "../resource-colors";
import { DayRail, type RailBlock } from "../resource-roster/day-rail";
import type { StripDay } from "../resource-roster/roster-parts";
import { Tag } from "../visit-table/visit-chips";
import { roomTags } from "./params";
import type { RoomRow } from "./types";

// The pieces a room is shown with in the rooms' roster. Rendered on the
// server.

const personColor = (person: { id: string; color: string | null }) =>
  resourceColors(person.color, person.id).accent;

/** The room's colour as a square, with its initials. */
export function RoomMark({
  room,
  size = 34,
}: {
  room: Pick<RoomRow, "id" | "name" | "color">;
  size?: number;
}) {
  const accent = resourceColors(room.color, room.id).accent;
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-[8px] text-[0.6875rem] font-bold"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${accent} 16%, var(--surface))`,
        boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${accent} 45%, transparent)`,
        color: `color-mix(in srgb, ${accent} 60%, var(--text))`,
      }}
    >
      {initialsOf(room.name)}
    </span>
  );
}

export function RoomTags({
  room,
}: {
  room: Pick<RoomRow, "active" | "onSite">;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {roomTags(room).map((tag) => (
        <Tag key={tag.label} tone={tag.tone}>
          {tag.label}
        </Tag>
      ))}
    </span>
  );
}

/** The week for the strip: open days in the room's colour, the rest hatched. */
export function roomStripDays(days: RoomDay[], color: string): StripDay[] {
  return days.map((day) => ({
    key: day.date,
    weekday: day.weekday,
    isToday: day.isToday,
    state: day.hours ? "on" : "closed",
    color,
    percent: day.percent,
    overbooked: day.overbooked,
    title: day.closed
      ? `${day.weekday} ${day.dateLabel}: zamknięty (${day.closed})`
      : day.hours
        ? `${day.weekday} ${day.dateLabel}: ${day.hours}, obłożenie ${day.percent}%`
        : `${day.weekday} ${day.dateLabel}: zamknięty`,
  }));
}

/** Today's duties and visits as the rail's blocks. */
export function railBlocks(today: RoomToday): RailBlock[] {
  return [
    ...today.duties.map((one) => ({
      key: one.key,
      kind: "duty" as const,
      start: one.start,
      end: one.end,
      color: personColor(one.person),
      title: `Dyżur: ${one.person.name}, ${one.time}`,
    })),
    ...today.visits.map((one) => ({
      key: one.key,
      kind: "visit" as const,
      start: one.start,
      end: one.end,
      color: personColor(one.person),
      label: initialsOf(one.person.name),
      title: `Wizyta: ${one.person.name}, ${one.time}`,
    })),
  ];
}

/** Dziś: the day on a large rail, then who is on duty when. */
export function RoomTodayPane({
  room,
  today,
}: {
  room: Pick<RoomRow, "name">;
  today: RoomToday;
}) {
  const visitsOf = (personId: string) =>
    today.visits.filter((one) => one.person.id === personId).length;
  return (
    <div className="grid gap-3">
      <DayRail
        blocks={railBlocks(today)}
        closed={today.closed}
        label={`Dziś w gabinecie: ${room.name}`}
        large
        now={today.now}
        range={today.range}
      />
      {today.duties.length ? (
        <ul className="grid">
          {today.duties.map((duty) => {
            const count = visitsOf(duty.person.id);
            return (
              <li
                className={cn(
                  "grid min-h-9 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-2.5 border-b text-[0.8125rem] last:border-b-0",
                  ROW_LINE,
                )}
                key={duty.key}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ background: personColor(duty.person) }}
                />
                <span className="min-w-0 truncate">
                  <span className="font-medium">{duty.person.name}</span>
                  <span className="text-[var(--text-muted)]">
                    {" "}
                    · dyżur {duty.time}
                  </span>
                </span>
                <span className="text-[0.75rem] text-[var(--text-muted)] tabular-nums">
                  {visitsLabel(count)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[0.8125rem] text-[var(--text-muted)]">
          {today.closed
            ? "Gabinet jest dziś zamknięty."
            : "Dziś nikt nie ma tu dyżuru."}
        </p>
      )}
    </div>
  );
}

/** Kto korzysta: who is on duty there this week, with their share. */
export function RoomUsersPane({
  users,
  availableHours,
}: {
  users: RoomUser[];
  availableHours: number;
}) {
  if (!users.length) {
    return (
      <p className="text-[0.8125rem] text-[var(--text-muted)]">
        W tym tygodniu nikt nie ma tu dyżuru.
      </p>
    );
  }
  return (
    // Laid out by the room it has (a tab or a narrow column), not the screen.
    <ul className="@container grid">
      {users.map((user) => {
        const share = availableHours
          ? Math.min(100, (user.hours / availableHours) * 100)
          : 0;
        return (
          <li
            className={cn(
              "grid min-h-10 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-x-3 border-b py-1 text-[0.8125rem] last:border-b-0 @md:grid-cols-[10px_minmax(0,1fr)_7rem_10rem]",
              ROW_LINE,
            )}
            key={user.person.id}
          >
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full"
              style={{ background: personColor(user.person) }}
            />
            <span className="grid min-w-0">
              <span className="truncate font-medium">{user.person.name}</span>
              <span className="text-[0.75rem] text-[var(--text-muted)] @md:hidden">
                {user.days}
              </span>
            </span>
            <span className="hidden text-[var(--text-muted)] @md:block">
              {user.days}
            </span>
            <span className="flex items-center justify-end gap-2 tabular-nums">
              <span
                aria-hidden="true"
                className="hidden h-[5px] w-24 overflow-hidden rounded-full bg-[var(--surface-muted)] @md:block"
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${share}%`,
                    background: personColor(user.person),
                  }}
                />
              </span>
              {hoursShort(user.hours)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Godziny i wyjątki: the week's hours, and what differs on given days. */
export function RoomHoursPane({
  room,
}: {
  room: Pick<RoomRow, "openingHours" | "exceptions">;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 md:gap-8">
      <section aria-label="Godziny otwarcia">
        <h3 className="mb-1 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
          Godziny otwarcia
        </h3>
        <dl>
          {room.openingHours.map((day) => (
            <div
              className={cn(
                "grid min-h-7 grid-cols-[3rem_1fr] items-center border-b text-[0.8125rem] last:border-b-0",
                ROW_LINE,
              )}
              key={day.weekday}
            >
              <dt className="font-semibold">{day.weekday}</dt>
              <dd
                className={
                  day.hours
                    ? "font-mono text-[0.75rem]"
                    : "text-[var(--text-muted)]"
                }
              >
                {day.hours ?? "zamknięty"}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-label="Wyjątki">
        <h3 className="mb-1 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
          Wyjątki
        </h3>
        {room.exceptions.length ? (
          <dl>
            {room.exceptions.map((one) => (
              <div
                className={cn(
                  "grid min-h-7 grid-cols-[3.5rem_1fr] items-center gap-2 border-b text-[0.8125rem] last:border-b-0",
                  ROW_LINE,
                )}
                key={one.key}
              >
                <dt className="font-mono text-[0.75rem] text-[var(--text-muted)]">
                  {one.date}
                </dt>
                <dd>{one.text}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-[0.8125rem] text-[var(--text-muted)]">
            Brak zaplanowanych wyjątków.
          </p>
        )}
      </section>
    </div>
  );
}
