import type { TimelineCard as Card } from "@repo/scheduling";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { scheduleTheme } from "../resource-colors";
import { Tooltip, TooltipContent, TooltipTrigger } from "../tooltip";
import { Tag } from "../visit-table/visit-chips";

// A booking on the day's line: by room, in its specialist's colour with
// their picture and the hour; by person, in its room's colour with the
// client. Its details in a tooltip on hover or focus; a click opens it in
// the bookings table.

export function TimelineCard({
  card,
  by,
  avatar,
}: {
  card: Card;
  /** The lane it sits in: a room's (who) or a person's (where). */
  by: "room" | "person";
  avatar?: string | null;
}) {
  const colour =
    by === "room"
      ? scheduleTheme(card.specialist.color, card.specialist.id)
      : scheduleTheme(
          card.place.color,
          card.place.id ?? "online",
          card.place.online,
        );
  const label = `${card.clientName}, ${card.time}, ${card.place.name}, ${card.status.label}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          aria-label={label}
          className={cn(
            "absolute top-1 bottom-1 flex min-w-0 items-center gap-1 overflow-hidden rounded-[5px] border border-l-[3px] pr-1 pl-0.5 text-[0.6875rem] leading-tight transition-[box-shadow,transform] hover:z-10 hover:-translate-y-px hover:shadow-[var(--shadow-raised)] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
            card.past && "opacity-55",
            card.awaitingPayment && "border-dashed",
          )}
          href={card.href}
          scroll={false}
          style={{
            left: `${card.left}%`,
            // All the time it holds: the visit and the time after it.
            width: `${Math.max(card.width, card.heldWidth)}%`,
            background: colour.cardBg,
            borderColor: colour.accent,
            color: colour.text,
          }}
        >
          {card.heldWidth > card.width ? (
            // The time after it (notes, getting ready): held, not a gap.
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 border-l border-dashed"
              style={{
                width: `${((card.heldWidth - card.width) / card.heldWidth) * 100}%`,
                borderColor: `color-mix(in srgb, ${colour.accent} 45%, transparent)`,
                backgroundImage: `repeating-linear-gradient(135deg, color-mix(in srgb, ${colour.accent} 16%, transparent) 0 2px, transparent 2px 6px)`,
              }}
            />
          ) : null}
          {by === "room" ? (
            <>
              <Avatar aria-hidden="true" className="size-[18px] shrink-0">
                {avatar ? <AvatarImage alt="" src={avatar} /> : null}
                <AvatarFallback
                  className="text-[0.5rem] leading-none font-bold"
                  style={{ background: colour.solid, color: "#fff" }}
                >
                  {card.specialist.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold tabular-nums">
                {card.time.slice(0, 5)}
              </span>
            </>
          ) : (
            <span className="grid min-w-0 pl-1">
              <span className="truncate font-semibold">{card.clientName}</span>
              <span className="truncate text-[0.625rem] tabular-nums opacity-80">
                {card.time.slice(0, 5)} · {card.place.name}
              </span>
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent
        className="grid w-64 gap-1.5 border border-[var(--border)] bg-[var(--surface)] p-3 text-[var(--text)]"
        side="bottom"
      >
        <span className="text-[0.6875rem] text-[var(--text-muted)] tabular-nums">
          {card.reference}
        </span>
        <span className="text-[0.8125rem] font-semibold">
          {card.clientName}
        </span>
        <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[0.75rem]">
          <dt className="text-[var(--text-muted)]">Termin</dt>
          <dd className="tabular-nums">{card.time}</dd>
          <dt className="text-[var(--text-muted)]">Usługa</dt>
          <dd>{card.serviceName}</dd>
          <dt className="text-[var(--text-muted)]">Specjalista</dt>
          <dd>{card.specialist.name}</dd>
          <dt className="text-[var(--text-muted)]">Miejsce</dt>
          <dd>{card.place.name}</dd>
        </dl>
        <span>
          <Tag tone={card.status.tone}>{card.status.label}</Tag>
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
