import type {
  DayNav as Nav,
  DayTimeline,
  TimelineCard as Card,
  TimelineLane,
} from "@repo/scheduling";
import { PageLink as Link } from "../public-site/page-link";
import { scheduleTheme } from "../resource-colors";
import { SpecialistChip, Tag } from "../visit-table/visit-chips";
import { DayNav } from "./day-nav";
import { LaneSwitch, type LaneView } from "./lane-switch";
import { TimelineCard } from "./timeline-card";

// Today on a line of hours (the dashboard, docs/product/booking-plan.md
// R14), rendered on the server: a lane per room (or per person, switched in
// the browser), the bookings on it, and a red line where now is. A lane
// lights up softly in its colour on hover. On a phone the day is a list
// by the hour instead; the line comes from a tablet on.

const LIST = "Dzisiejsze wizyty";

/** `1 wizyta`, `3 wizyty`, `8 wizyt`; none: `bez wizyt`. */
function visitsCount(count: number) {
  if (count === 0) return "bez wizyt";
  if (count === 1) return "1 wizyta";
  const last = count % 10;
  const lastTwo = count % 100;
  return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)
    ? `${count} wizyty`
    : `${count} wizyt`;
}

function Heading({ title, count }: { title: string; count: string }) {
  return (
    <>
      <h2 className="text-[0.8125rem] font-semibold">{title}</h2>
      <span className="text-[0.75rem] text-[var(--text-muted)]">· {count}</span>
    </>
  );
}

function laneColour(lane: TimelineLane) {
  return scheduleTheme(lane.color, lane.id, lane.kind === "online").accent;
}

function Lanes({
  day,
  lanes,
  label,
  by,
  avatars,
}: {
  day: DayTimeline;
  lanes: TimelineLane[];
  label: string;
  by: "room" | "person";
  avatars: Record<string, string | null>;
}) {
  const hours = day.hours.length;
  return (
    <div className="relative [--name-w:13rem] lg:[--name-w:15rem]">
      <div
        aria-hidden="true"
        className="grid h-6 grid-cols-[var(--name-w)_minmax(0,1fr)] border-b border-[var(--border)]"
      >
        <span />
        <span className="relative">
          {day.hours.map((hour, index) => (
            <span
              className="absolute top-1 border-l border-[var(--border)] pl-1 text-[0.625rem] leading-4 text-[var(--text-muted)] tabular-nums"
              key={hour}
              style={{ left: `${(index / hours) * 100}%` }}
            >
              {hour}:00
            </span>
          ))}
        </span>
      </div>
      <ul aria-label={label}>
        {lanes.map((lane) => {
          const colour = laneColour(lane);
          return (
            <li
              className="grid h-11 grid-cols-[var(--name-w)_minmax(0,1fr)] border-b border-[var(--border)] transition-colors hover:bg-[var(--tint)] motion-reduce:transition-none"
              key={lane.id}
              style={{
                ["--tint" as string]: `color-mix(in srgb, ${colour} 6%, transparent)`,
              }}
            >
              <span className="flex min-w-0 items-center gap-2 px-3">
                {lane.kind === "person" ? (
                  <span className="min-w-0">
                    <SpecialistChip
                      avatar={avatars[lane.id]}
                      row={{
                        specialistId: lane.id,
                        specialistName: lane.name,
                        specialistColor: lane.color,
                        cancelled: false,
                      }}
                    />
                  </span>
                ) : (
                  <span
                    className="inline-flex min-w-0 items-center gap-1.5 text-[0.8125rem] font-medium"
                    style={{
                      color: `color-mix(in oklab, ${colour} 72%, var(--text))`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: colour }}
                    />
                    <span className="truncate">{lane.name}</span>
                  </span>
                )}
                <small className="ml-auto shrink-0 text-[0.6875rem] text-[var(--text-muted)] tabular-nums">
                  {lane.summary}
                </small>
              </span>
              <span
                className="relative"
                style={{
                  backgroundImage: `repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px calc(100% / ${hours}))`,
                }}
              >
                {lane.cards.map((card) => (
                  <TimelineCard
                    avatar={avatars[card.specialist.id]}
                    by={by}
                    card={card}
                    key={card.id}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
      {day.now !== null ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-6 right-0 bottom-0 left-[var(--name-w)]"
        >
          <span
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]"
            style={{ left: `${day.now}%` }}
          />
        </span>
      ) : null}
    </div>
  );
}

/** The day as a list, by the hour (a phone). */
function DayList({
  cards,
  avatars,
  today,
}: {
  cards: Card[];
  avatars: Record<string, string | null>;
  today: boolean;
}) {
  if (!cards.length) {
    return (
      <p className="px-3 py-3 text-[0.8125rem] text-[var(--text-muted)]">
        {today ? "Dziś bez wizyt." : "Tego dnia nie ma wizyt."}
      </p>
    );
  }
  return (
    <ul aria-label={LIST}>
      {cards.map((card) => (
        <li className="border-b border-[var(--border)]" key={card.id}>
          <Link
            className="grid min-h-12 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 hover:bg-[var(--surface-subtle)] focus-visible:bg-[var(--surface-subtle)] focus-visible:outline-none"
            href={card.href}
            scroll={false}
          >
            <span
              className={
                card.past
                  ? "text-[0.8125rem] text-[var(--text-muted)] tabular-nums"
                  : "text-[0.8125rem] font-semibold tabular-nums"
              }
            >
              {card.time.slice(0, 5)}
            </span>
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate text-[0.8125rem] font-medium">
                {card.clientName}
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <SpecialistChip
                  avatar={avatars[card.specialist.id]}
                  row={{
                    specialistId: card.specialist.id,
                    specialistName: card.specialist.name,
                    specialistColor: card.specialist.color,
                    cancelled: false,
                  }}
                />
                <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
                  {card.place.name}
                </span>
              </span>
            </span>
            <Tag tone={card.status.tone}>
              {card.status.label.split(" · ")[0]}
            </Tag>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DayTimelineView({
  day,
  view = "gabinety",
  avatars = {},
  nav,
}: {
  day: DayTimeline;
  /** The day shown and the way to others (none: no navigation). */
  nav?: Nav;
  /** The lanes shown first (from the address, ?os=…). */
  view?: LaneView;
  /** The specialists' pictures, by their id. */
  avatars?: Record<string, string | null>;
}) {
  const cards = day.rooms
    .flatMap((lane) => lane.cards)
    .sort((a, b) => a.left - b.left);
  const count = visitsCount(cards.length);
  return (
    <section aria-label="Dzień" className="border-b border-[var(--border)]">
      <div className="md:hidden">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-[var(--border)] px-3 py-1.5">
          <h2 className="text-[0.8125rem] font-semibold">
            {nav && !nav.isToday ? "Dzień" : "Dziś"}
          </h2>
          <span className="text-[0.75rem] text-[var(--text-muted)]">
            · {count}
          </span>
          {nav ? (
            <span className="ml-auto">
              <DayNav nav={nav} />
            </span>
          ) : null}
        </div>
        <DayList avatars={avatars} cards={cards} today={!nav || nav.isToday} />
      </div>
      <div className="hidden md:block">
        <LaneSwitch
          headings={{
            gabinety: <Heading count={count} title="Dzień w gabinetach" />,
            specjalisci: <Heading count={count} title="Dzień zespołu" />,
          }}
          end={nav ? <DayNav nav={nav} /> : null}
          initial={view}
          people={
            <Lanes
              avatars={avatars}
              by="person"
              day={day}
              label="Dzień zespołu"
              lanes={day.people}
            />
          }
          rooms={
            <Lanes
              avatars={avatars}
              by="room"
              day={day}
              label="Dzień w gabinetach"
              lanes={day.rooms}
            />
          }
        />
      </div>
    </section>
  );
}
