import type {
  DayNav as Nav,
  DayTimeline,
  TimelineCard as Card,
  TimelineLane,
} from "@repo/scheduling";
import { ArrowUpRight, Video } from "lucide-react";
import { PageLink as Link } from "../public-site/page-link";
import { scheduleTheme } from "../resource-colors";
import { PlaceLabel, SpecialistChip, Tag } from "../visit-table/visit-chips";
import { DayNav } from "./day-nav";
import { LaneSwitch, type LaneView } from "./lane-switch";
import { NowLine } from "./now-line";
import { TimelineCard } from "./timeline-card";

// Today on a line of hours (the dashboard, docs/product/booking-plan.md
// R14), rendered on the server: a lane per room (or per person, switched in
// the browser), the bookings on it, and a red line where now is. A lane
// lights up softly in its colour on hover. The same day as a list by the
// hour (DayAgenda) sits under it, and on a phone stands in for it.

const LIST = "Plan dnia";

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
              className="grid h-11 grid-cols-[var(--name-w)_minmax(0,1fr)] border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--tint)] motion-reduce:transition-none"
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
      <NowLine line={day} />
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
  // One line a visit (a phone: number, where and price under who): its
  // hour and number, who leads it, where (the room in its colour, online
  // with its mark), its price, its state, and the way to it in the
  // bookings. From a tablet on the parts are put in their columns' order.
  return (
    // The columns are the list's, so they line up from row to row.
    <ul
      aria-label={LIST}
      className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] gap-x-2.5 sm:grid-cols-[2.75rem_auto_minmax(0,1fr)_minmax(0,0.9fr)_auto_auto_auto]"
    >
      {cards.map((card) => (
        <li
          className="col-span-full grid grid-cols-subgrid items-center gap-y-0.5 border-b border-[var(--border)] px-3 py-1.5 text-[0.8125rem] last:border-b-0"
          key={card.id}
        >
          <span
            className={
              card.past
                ? "text-[var(--text-muted)] tabular-nums"
                : "font-semibold tabular-nums"
            }
          >
            {card.time.slice(0, 5)}
          </span>
          <span className="min-w-0 sm:order-2">
            <SpecialistChip
              avatar={avatars[card.specialist.id]}
              row={{
                specialistId: card.specialist.id,
                specialistName: card.specialist.name,
                specialistColor: card.specialist.color,
                cancelled: false,
              }}
            />
          </span>
          <span className="col-start-2 row-start-2 flex min-w-0 items-center gap-2.5 text-[0.75rem] sm:contents sm:text-[0.8125rem]">
            <span className="whitespace-nowrap text-[var(--text-muted)] tabular-nums sm:order-1">
              {card.reference}
            </span>
            <span className="min-w-0 sm:order-3">
              {card.place.online ? (
                <span
                  className="inline-flex min-w-0 items-center gap-1.5 font-medium"
                  style={{
                    color: `color-mix(in oklab, ${scheduleTheme(null, "online", true).accent} 72%, var(--text))`,
                  }}
                >
                  <Video aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{card.place.name}</span>
                </span>
              ) : (
                <PlaceLabel
                  row={{
                    roomId: card.place.id,
                    roomColor: card.place.color,
                    mode: "in_person",
                    room: card.place.name,
                    cancelled: false,
                  }}
                />
              )}
            </span>
            <span className="text-right whitespace-nowrap tabular-nums sm:order-4">
              {card.price}
            </span>
          </span>
          <span className="justify-self-start sm:order-5">
            <Tag tone={card.status.tone}>
              {card.status.label.split(" · ")[0]}
            </Tag>
          </span>
          <Link
            aria-label={`Szczegóły rezerwacji ${card.reference}`}
            className="inline-grid size-7 place-items-center rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none sm:order-6"
            href={card.href}
            title="Szczegóły w rezerwacjach"
          >
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The day's bookings, in order of their hour. */
function dayCards(day: DayTimeline) {
  return day.rooms
    .flatMap((lane) => lane.cards)
    .sort((a, b) => a.left - b.left);
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
  const count = visitsCount(dayCards(day).length);
  return (
    <section aria-label="Dzień">
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
    </section>
  );
}

/**
 * The same day as a list, by the hour: beside what needs doing, and on a
 * phone in place of the line (then with the way to other days).
 */
export function DayAgenda({
  day,
  avatars = {},
  nav,
}: {
  day: DayTimeline;
  /** The day shown and the way to others, shown on a phone only. */
  nav?: Nav;
  avatars?: Record<string, string | null>;
}) {
  const cards = dayCards(day);
  return (
    <section aria-labelledby="plan-dnia">
      <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-[var(--border)] px-3 py-1.5">
        <h2 className="text-[0.8125rem] font-semibold" id="plan-dnia">
          {LIST}
        </h2>
        <span className="text-[0.75rem] text-[var(--text-muted)]">
          · {visitsCount(cards.length)}
        </span>
        {nav ? (
          <span className="ml-auto md:hidden">
            <DayNav nav={nav} />
          </span>
        ) : null}
      </div>
      <DayList avatars={avatars} cards={cards} today={!nav || nav.isToday} />
    </section>
  );
}
