import { minutesToTime, type MinuteRange } from "@repo/scheduling";
import { cn } from "../lib/utils";

// A day on a line of hours: who is on duty when (light), the visits
// (solid), each in their person's colour, and a red line now. Small in a
// roster's row, large (with initials and the hours under it) when opened.
// Rendered on the server.

export interface RailBlock extends MinuteRange {
  key: string;
  kind: "duty" | "visit";
  /** Any CSS colour (the person's). */
  color: string;
  /** Initials on a large rail. */
  label?: string;
  /** `Anna Nowak, 10:00–10:50` */
  title: string;
}

const HATCH =
  "bg-[repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--text-subtle)_22%,transparent)_4px_5px)]";

export function DayRail({
  range,
  blocks,
  now = null,
  closed = null,
  large = false,
  label,
}: {
  range: MinuteRange;
  blocks: RailBlock[];
  /** Minutes since midnight now (today only). */
  now?: number | null;
  /** Closed all day: why. */
  closed?: string | null;
  large?: boolean;
  /** `Dziś w gabinecie: Gabinet Zielony` */
  label: string;
}) {
  const length = range.end - range.start;
  const at = (minute: number) =>
    `${Math.min(100, Math.max(0, ((minute - range.start) / length) * 100))}%`;
  const width = (one: MinuteRange) =>
    `${Math.max(0, ((Math.min(one.end, range.end) - Math.max(one.start, range.start)) / length) * 100)}%`;
  const hours = Array.from(
    { length: Math.floor(length / 120) + 1 },
    (_, index) => range.start + index * 120,
  );
  return (
    <figure className="m-0 grid min-w-0 gap-1">
      <div
        aria-label={label}
        className={cn(
          "relative overflow-hidden rounded-[4px]",
          large ? "h-11" : "h-[22px]",
          closed ? HATCH : "bg-[var(--surface-muted)]",
        )}
        role="img"
      >
        {closed ? (
          <span className="absolute inset-0 grid place-items-center text-[0.6875rem] text-[var(--text-muted)]">
            {closed}
          </span>
        ) : (
          blocks.map((block) =>
            block.kind === "duty" ? (
              <span
                className="absolute inset-y-0 rounded-[4px]"
                key={block.key}
                style={{
                  left: at(block.start),
                  width: width(block),
                  background: `color-mix(in srgb, ${block.color} 14%, var(--surface))`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${block.color} 30%, transparent)`,
                }}
                title={block.title}
              />
            ) : (
              <span
                className={cn(
                  "absolute flex items-center overflow-hidden rounded-[3px] px-1 text-[0.59375rem] font-semibold whitespace-nowrap text-white",
                  large ? "inset-y-1.5" : "inset-y-1",
                )}
                key={block.key}
                style={{
                  left: at(block.start),
                  width: width(block),
                  background: `color-mix(in srgb, ${block.color} 70%, black)`,
                }}
                title={block.title}
              >
                {large ? block.label : null}
              </span>
            ),
          )
        )}
        {!closed && now !== null && now >= range.start && now <= range.end ? (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--danger)]"
            style={{ left: at(now) }}
          />
        ) : null}
      </div>
      {large ? (
        <figcaption
          aria-hidden="true"
          className="flex justify-between font-mono text-[0.59375rem] text-[var(--text-muted)]"
        >
          {hours.map((minute) => (
            <span key={minute}>
              {minutesToTime(minute).replace(/:00$/, "")}
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
