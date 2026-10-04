import {
  visitsLabel,
  type ServiceDay,
  type ServiceVisit,
} from "@repo/scheduling";
import { CircleAlert, CircleCheck } from "lucide-react";
import Image from "next/image";
import { ROW_LINE } from "../detail-page/detail-page";
import { cn } from "../lib/utils";
import { offerMatte } from "../public-site/offer-brush-matte.data";
import { OfferTile } from "../public-site/offer-tile";
import { PageLink as Link } from "../public-site/page-link";
import { SERVICE_ICONS, serviceDisplayName } from "../public-site/service-look";
import { OfferToggle } from "../specialists/offer-toggle";
import { OfferForms } from "../specialists/specialist-offers";
import { PlaceName, SpecialistAvatar } from "../specialists/specialist-parts";
import type { OfferStateAction } from "../specialists/types";
import { Tag } from "../visit-table/visit-chips";
import { durationsLabel, priceRange, type ReadinessItem } from "./params";
import type { ServiceOffer, ServiceRow } from "./types";

// The pieces a service is shown with, in the offer's roster and on its
// page: its mark (the site's watercolor and icon), who leads it, its
// prices, its week, its offers and visits as tables, what it still needs,
// and its tile as the site shows it. Rendered on the server (the offers'
// switches are small client islands).

/** The site's tile, small: its watercolor and its category's icon. */
export function ServiceMark({
  service,
  size = 36,
}: {
  service: Pick<ServiceRow, "paint" | "category">;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[8px] bg-[var(--surface-subtle)] shadow-[inset_0_0_0_1px_rgb(16_32_28/0.08)] [&>svg]:relative [&>svg]:size-[45%] [&>svg]:stroke-white [&>svg]:drop-shadow-[0_1px_1px_rgb(0_0_0/0.25)]"
      style={{ width: size, height: size }}
    >
      <Image
        alt=""
        className="scale-[1.6] object-cover"
        fill
        sizes={`${size * 2}px`}
        src={offerMatte.paints[service.paint].src}
      />
      {SERVICE_ICONS[service.category]}
    </span>
  );
}

const MAX_AVATARS = 5;

/**
 * Who leads it: their pictures overlapping, in their colours; the one
 * pointed at comes forward. A switched-off offer in grey; nobody: a
 * warning.
 */
export function OfferAvatars({
  offers,
  size = 24,
}: {
  offers: ServiceOffer[];
  size?: number;
}) {
  if (!offers.length) {
    return <Tag tone="warning">Nikt nie prowadzi</Tag>;
  }
  const shown = offers.slice(0, MAX_AVATARS);
  const more = offers.length - shown.length;
  return (
    <ul aria-label="Prowadzą" className="flex items-center pl-1">
      {shown.map((offer) => (
        <li
          className={cn(
            "relative -ml-1.5 flex transition-transform duration-150 first:ml-0 hover:z-10 hover:-translate-y-0.5 hover:scale-110 motion-reduce:transition-none",
            !offer.active && "grayscale",
          )}
          key={offer.id}
          title={
            offer.active
              ? offer.specialist.name
              : `${offer.specialist.name} (oferta wyłączona)`
          }
        >
          <SpecialistAvatar row={offer.specialist} size={size} />
          <span className="sr-only">
            {offer.specialist.name}
            {offer.active ? "" : " (oferta wyłączona)"}
          </span>
        </li>
      ))}
      {more > 0 ? (
        <li className="relative -ml-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-[var(--surface-muted)] px-1 text-[0.6875rem] font-semibold text-[var(--text-muted)] shadow-[0_0_0_1.5px_var(--surface)]">
          +{more}
        </li>
      ) : null}
    </ul>
  );
}

/** The prices and, under them, the times. */
export function ServicePrice({
  service,
}: {
  service: Pick<ServiceRow, "offers" | "durationMinutes">;
}) {
  const price = priceRange(service.offers);
  return (
    <span className="grid min-w-0 leading-tight">
      <span
        className={cn(
          "truncate text-[0.8125rem] font-semibold tabular-nums",
          !price && "text-[var(--text-muted)]",
        )}
      >
        {price ?? "—"}
      </span>
      <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
        {durationsLabel(service)}
      </span>
    </span>
  );
}

/** The week's visits, a bar a day (today stronger), and their sum. */
export function ServiceWeekBars({
  days,
  visitCount,
  max,
}: {
  days: ServiceDay[];
  visitCount: number;
  /** The busiest day of all the services shown: one scale for all. */
  max: number;
}) {
  return (
    <span className="grid gap-1">
      <span
        aria-label={`Wizyty w tym tygodniu: ${visitCount}`}
        className="grid h-[18px] grid-cols-7 items-end gap-0.5"
        role="img"
      >
        {days.map((day) => (
          <span
            aria-hidden="true"
            className={cn(
              "block rounded-t-[2px]",
              !day.count
                ? "bg-[var(--surface-muted)]"
                : day.isToday
                  ? "bg-[var(--primary)]"
                  : "bg-[color-mix(in_srgb,var(--primary)_55%,var(--surface))]",
            )}
            key={day.date}
            style={{
              height: day.count
                ? `${Math.max(18, (day.count / Math.max(1, max)) * 100)}%`
                : "12%",
            }}
            title={`${day.weekday}: ${visitsLabel(day.count)}`}
          />
        ))}
      </span>
      <span className="text-[0.71875rem] whitespace-nowrap text-[var(--text-muted)]">
        <span className="font-semibold text-[var(--text)]">
          {visitsLabel(visitCount)}
        </span>{" "}
        w tyg.
      </span>
    </span>
  );
}

const TH =
  "h-8 border-b border-[var(--border)] pr-3 text-left text-[0.75rem] font-medium whitespace-nowrap text-[var(--text-muted)]";
const TD = cn("h-11 border-b pr-3 align-middle whitespace-nowrap", ROW_LINE);

/**
 * Who leads it at what price, as a table, the switches in the row (on a
 * specialist's page the same offers, a service a row). Without an action
 * the states are words.
 */
export function ServiceOfferTable({
  offers,
  defaultMinutes,
  action,
}: {
  offers: ServiceOffer[];
  /** The service's time: a specialist's own one stands out. */
  defaultMinutes: number;
  action?: OfferStateAction;
}) {
  if (!offers.length) {
    return (
      <p className="flex items-start gap-2 rounded-[6px] bg-[var(--warning-soft)] px-3 py-2 text-[0.8125rem] text-[var(--warning-foreground)]">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">
            Nikt jeszcze nie prowadzi tej usługi.
          </span>{" "}
          Specjaliści dodają ją w swoim portalu (Usługi i cennik), a ceny
          ustalają sami.
        </span>
      </p>
    );
  }
  const own = offers.some((offer) => offer.durationMinutes !== defaultMinutes);
  const state = (offer: ServiceOffer) =>
    action ? (
      <OfferToggle
        action={action}
        label="Oferta aktywna"
        offer={offer}
        subject={offer.specialist.name}
      />
    ) : (
      <span className="text-[0.75rem] text-[var(--text-muted)]">
        {offer.active ? "Tak" : "Nie"}
      </span>
    );
  return (
    <div className="grid gap-2">
      {/* Room for the pictures' rings, which the scrolling would cut. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full border-separate border-spacing-0 text-[0.8125rem] text-[var(--text)] [&_tr:last-child>*]:border-b-0">
          <caption className="sr-only">Specjaliści i ceny</caption>
          <thead>
            <tr>
              <th className={TH} scope="col">
                Specjalista
              </th>
              <th className={TH} scope="col">
                Cena
              </th>
              <th className={cn(TH, "hidden sm:table-cell")} scope="col">
                Czas
              </th>
              <th className={cn(TH, "hidden md:table-cell")} scope="col">
                Formy
              </th>
              <th className={TH} scope="col">
                Aktywna
              </th>
            </tr>
          </thead>
          <tbody>
            {offers.map((offer) => {
              const differs = offer.durationMinutes !== defaultMinutes;
              return (
                <tr
                  className={cn(!offer.active && "text-[var(--text-muted)]")}
                  key={offer.id}
                >
                  <th className={cn(TD, "text-left font-normal")} scope="row">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex shrink-0",
                          !offer.active && "grayscale",
                        )}
                      >
                        <SpecialistAvatar row={offer.specialist} size={24} />
                      </span>
                      <Link
                        className="truncate font-semibold hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                        href={offer.specialist.href}
                      >
                        {offer.specialist.name}
                      </Link>
                      {offer.specialist.title ? (
                        <span className="hidden truncate text-[0.75rem] text-[var(--text-muted)] lg:inline">
                          {offer.specialist.title}
                        </span>
                      ) : null}
                    </span>
                  </th>
                  <td className={cn(TD, "tabular-nums")}>{offer.price}</td>
                  <td
                    className={cn(
                      TD,
                      "hidden tabular-nums sm:table-cell",
                      differs &&
                        "font-semibold text-[var(--warning-foreground)]",
                    )}
                    title={
                      differs
                        ? `Własny czas (usługa: ${defaultMinutes} min)`
                        : undefined
                    }
                  >
                    {offer.durationMinutes} min
                  </td>
                  <td className={cn(TD, "hidden md:table-cell")}>
                    <OfferForms offer={offer} />
                  </td>
                  <td className={TD}>{state(offer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {own ? (
        <p className="hidden text-[0.75rem] text-[var(--text-muted)] sm:block">
          Czas wyróżniony: specjalista ma własny zamiast {defaultMinutes} min
          usługi.
        </p>
      ) : null}
    </div>
  );
}

/** Najbliższe wizyty: a table, a value a column; each opens its booking. */
export function ServiceVisitTable({
  visits,
  visitHref,
}: {
  visits: ServiceVisit[];
  visitHref: (visitId: string) => string;
}) {
  if (!visits.length) {
    return (
      <p className="py-2 text-[0.8125rem] text-[var(--text-muted)]">
        Brak zaplanowanych wizyt tej usługi.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[0.8125rem] text-[var(--text)] [&_tr:last-child>*]:border-b-0">
        <caption className="sr-only">Najbliższe wizyty</caption>
        <thead>
          <tr>
            <th className={cn(TH, "w-24")} scope="col">
              Data
            </th>
            <th className={cn(TH, "w-28")} scope="col">
              Godzina
            </th>
            <th className={TH} scope="col">
              Klient
            </th>
            <th className={cn(TH, "hidden md:table-cell")} scope="col">
              Specjalista
            </th>
            <th className={cn(TH, "hidden w-40 sm:table-cell")} scope="col">
              Gdzie
            </th>
            <th className={cn(TH, "hidden w-40 sm:table-cell")} scope="col">
              Stan
            </th>
          </tr>
        </thead>
        <tbody>
          {visits.map((visit) => {
            const [weekday, date] = visit.dateLabel.split(" ");
            return (
              <tr key={visit.visitId}>
                <td className={cn(TD, "h-9 tabular-nums")}>
                  <span className="font-semibold">{weekday}</span>{" "}
                  <span className="text-[var(--text-muted)]">{date}</span>
                </td>
                <td className={cn(TD, "h-9 font-mono text-[0.75rem]")}>
                  {visit.time}
                </td>
                <td className={cn(TD, "h-9 max-w-0 truncate font-semibold")}>
                  <Link
                    className="rounded hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    href={visitHref(visit.visitId)}
                  >
                    {visit.client}
                  </Link>
                </td>
                <td
                  className={cn(
                    TD,
                    "hidden h-9 max-w-0 truncate text-[var(--text-muted)] md:table-cell",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          visit.specialist.color ?? "var(--text-subtle)",
                      }}
                    />
                    {visit.specialist.name}
                  </span>
                </td>
                <td
                  className={cn(
                    TD,
                    "hidden h-9 text-[var(--text-muted)] sm:table-cell",
                  )}
                >
                  <PlaceName place={visit.place} />
                </td>
                <td className={cn(TD, "hidden h-9 sm:table-cell")}>
                  <Tag tone={visit.pending ? "warning" : "success"}>
                    {visit.pending ? "Czeka na płatność" : "Potwierdzona"}
                  </Tag>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** What the site and the booking need of it: each with a tick or a warning. */
export function ServiceReadiness({ items }: { items: ReadinessItem[] }) {
  return (
    <ul aria-label="Gotowość" className="grid">
      {items.map((item) => (
        <li
          className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 border-b border-[var(--border)] py-2 text-[0.8125rem] last:border-b-0"
          key={item.key}
        >
          {item.ok ? (
            <CircleCheck
              aria-label="Gotowe"
              className="mt-0.5 size-4 text-[var(--success)]"
            />
          ) : (
            <CircleAlert
              aria-label="Brakuje"
              className="mt-0.5 size-4 text-[var(--warning)]"
            />
          )}
          <span className="grid min-w-0">
            <span className="text-[var(--text)]">{item.title}</span>
            <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
              {item.detail}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Its tile as the site's offer shows it (the site's own component, on the
 * site's paper; the app gives the site's fonts with `className`).
 */
export function ServiceSiteTile({
  service,
  className,
}: {
  service: Pick<
    ServiceRow,
    "name" | "shortDescription" | "publicUrl" | "category" | "paint"
  >;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-bg text-ink font-body grid justify-items-center overflow-hidden px-4 py-5",
        className,
      )}
    >
      <OfferTile
        as="div"
        // A set width: its height (5 : 8) is known before the layout.
        className="w-[13rem] max-w-full"
        headingLevel="h3"
        href={service.publicUrl}
        icon={SERVICE_ICONS[service.category]}
        paint={service.paint}
        sizes="13rem"
        title={serviceDisplayName(service.name)}
        {...(service.shortDescription && {
          description: service.shortDescription,
        })}
      />
    </div>
  );
}
