import { ArrowUpRight, CalendarDays, Clock } from "lucide-react";
import type { ReactNode } from "react";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors } from "../resource-colors";
import { DayRail } from "../resource-roster/day-rail";
import { RosterOpenLink } from "../resource-roster/open-link";
import { Roster, RosterEmpty, RosterWeek } from "../resource-roster/roster-bar";
import { RosterItem, type RosterTab } from "../resource-roster/roster-item";
import { NowLine, WeekStrip } from "../resource-roster/roster-parts";
import {
  railBlocks,
  RoomHoursPane,
  RoomMark,
  roomStripDays,
  RoomTags,
  RoomTodayPane,
  RoomUsersPane,
} from "./room-parts";
import type { RoomRow } from "./types";

// The centre's rooms as a roster: a room a row with its week as a strip
// (open when, how booked), what is happening there now and today on a
// line of hours; a click opens it in place on tabs (today large, who uses
// it this week, the hours and the exceptions). Rendered on the server.

const BUTTON =
  "inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none [&_svg]:size-3.5";

/** The room's page on a tab. */
const roomPage = (room: RoomRow, zakladka?: "grafik" | "godziny") =>
  zakladka ? `${room.href}?zakladka=${zakladka}` : room.href;

function Row({ room }: { room: RoomRow }) {
  const accent = resourceColors(room.color, room.id).accent;
  const tabs: RosterTab[] = [
    ...(room.today
      ? [
          {
            key: "dzis",
            label: "Dziś",
            content: <RoomTodayPane room={room} today={room.today} />,
          },
        ]
      : []),
    {
      key: "kto",
      label: "Kto korzysta",
      count: room.users.length,
      content: (
        <RoomUsersPane
          availableHours={room.occupancy.availableHours}
          users={room.users}
        />
      ),
    },
    {
      key: "godziny",
      label: "Godziny i wyjątki",
      count: room.exceptions.length,
      content: <RoomHoursPane room={room} />,
    },
  ];
  return (
    <RosterItem
      actions={
        <>
          <Link className={BUTTON} href={roomPage(room, "grafik")}>
            <CalendarDays aria-hidden="true" />
            Grafik
          </Link>
          <Link className={BUTTON} href={roomPage(room, "godziny")}>
            <Clock aria-hidden="true" />
            Godziny otwarcia
          </Link>
          <span className="hidden truncate text-[0.75rem] text-[var(--text-muted)] md:inline">
            {room.location} ·{" "}
            {room.capacity === 1 ? "1 osoba" : `do ${room.capacity} osób`}
          </span>
          <Link
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-[5px] bg-[var(--primary)] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:outline-none"
            href={room.href}
          >
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
            Otwórz stronę
          </Link>
        </>
      }
      id={room.id}
      identity={
        <span className="flex min-w-0 items-center gap-2.5">
          <RoomMark room={room} />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[0.875rem] font-semibold text-[var(--text)]">
              {room.name}
            </span>
            <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
              {room.hoursSummary ?? "Bez godzin otwarcia"}
            </span>
          </span>
        </span>
      }
      menu={
        <RosterOpenLink
          href={room.href}
          name={room.name}
          title="Otwórz stronę gabinetu"
        />
      }
      muted={!room.active}
      name={room.name}
      summary={
        <>
          <WeekStrip
            className="col-span-full lg:col-span-1"
            days={roomStripDays(room.days, accent)}
            label={`Tydzień: ${room.name}`}
          />
          <span className="col-span-full min-w-0 lg:col-span-1">
            <NowLine status={room.now} />
          </span>
          <span className="col-span-full min-w-0 lg:col-span-1">
            {room.today ? (
              <DayRail
                blocks={railBlocks(room.today)}
                closed={room.today.closed ? "Zamknięty" : null}
                label={`Dziś w gabinecie: ${room.name}`}
                now={room.today.now}
                range={room.today.range}
              />
            ) : null}
          </span>
          <span className="col-span-full flex min-w-0 lg:col-span-1 lg:justify-end">
            <RoomTags room={room} />
          </span>
        </>
      }
      summaryClassName="grid-cols-1 lg:grid-cols-[13rem_minmax(9rem,1fr)_11rem_minmax(0,8rem)]"
      tabs={tabs}
    />
  );
}

export function RoomRoster({
  rows,
  week,
  summary,
  empty,
}: {
  /** The rooms shown (searched, in the segment, in order). */
  rows: RoomRow[];
  week: {
    label: string;
    previousHref: string;
    nextHref: string;
    currentHref: string | null;
  };
  /** The rooms' week in a line, on the right. */
  summary?: ReactNode;
  /** What no row says. */
  empty: string;
}) {
  return (
    <Roster label="Gabinety" week={<RosterWeek {...week} summary={summary} />}>
      {rows.length ? (
        rows.map((room) => <Row key={room.id} room={room} />)
      ) : (
        <RosterEmpty>{empty}</RosterEmpty>
      )}
    </Roster>
  );
}
