import { LinkTabs, type LinkTabItem } from "../link-tabs";
import { PeriodNav, type PeriodNavProps } from "../period-nav";
import { PageLink as Link } from "../public-site/page-link";
import { resourceColors } from "../resource-colors";

// Above the calendar: the period and its neighbours, the view (day or
// week), whose columns or whose week, and what the colours mean. All
// links, so it renders on the server and works without JavaScript.

export interface CalendarResourceTab {
  key: string;
  label: string;
  href: string;
  active: boolean;
  color: string | null;
}

export interface CalendarToolbarProps {
  nav: Omit<PeriodNavProps, "linkAs" | "className">;
  views: LinkTabItem[];
  /** Specjaliści / Gabinety (the centre). */
  perspectives?: LinkTabItem[];
  /** The specialist or room of a week. */
  resources?: CalendarResourceTab[];
}

export function CalendarToolbar({
  nav,
  views,
  perspectives,
  resources,
}: CalendarToolbarProps) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <PeriodNav {...nav} linkAs={Link} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <LinkTabs ariaLabel="Widok" items={views} linkAs={Link} />
          {perspectives ? (
            <LinkTabs ariaLabel="Kolumny" items={perspectives} linkAs={Link} />
          ) : null}
        </div>
      </div>
      {resources?.length ? (
        <LinkTabs
          ariaLabel="Czyj tydzień"
          items={resources.map((resource) => ({
            key: resource.key,
            label: resource.label,
            href: resource.href,
            active: resource.active,
            icon: (
              <span
                aria-hidden="true"
                className="size-2 rounded-full"
                style={{
                  backgroundColor: resourceColors(resource.color, resource.key)
                    .accent,
                }}
              />
            ),
          }))}
          linkAs={Link}
          variant="chips"
        />
      ) : null}
    </div>
  );
}

/** What the calendar's shapes and colours mean. */
export function CalendarLegend() {
  const items = [
    {
      label: "Dostępność",
      swatch:
        "border border-l-[3px] border-[var(--border)] border-l-[var(--primary)] bg-[var(--primary-soft)]",
    },
    {
      label: "Wizyta",
      swatch:
        "border border-l-[3px] border-[var(--border-strong)] border-l-[var(--primary)] bg-[var(--surface)]",
    },
    {
      label: "Czeka na płatność",
      swatch:
        "border border-dashed border-l-[3px] border-[var(--border-strong)] border-l-[var(--primary)] bg-[var(--warning-soft)]",
    },
    { label: "Teraz", swatch: "h-0.5 self-center bg-[var(--danger)]" },
  ];
  return (
    <ul
      aria-label="Legenda"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]"
    >
      {items.map((item) => (
        <li className="flex items-center gap-1.5" key={item.label}>
          <span
            aria-hidden="true"
            className={`h-3 w-4 rounded-sm ${item.swatch}`}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
