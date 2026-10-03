"use client";

import type {
  NotificationDetail,
  NotificationView,
  VisitRow,
} from "@repo/scheduling";
import { Mail, MailOpen } from "lucide-react";
import type { Route } from "next";
import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { PageLink as Link } from "../public-site/page-link";
import { PlaceLabel, SpecialistChip, Tag } from "../visit-table/visit-chips";
import { KindIcon, NotificationBadges } from "./icons";

// One notification in the drawer: two short lines (what happened with its
// facts as icons; whose visit and when), the time and the booking's
// number on the right (the number leads to the booking), and the envelope
// that says read or new and switches it. A click unfolds the booking's
// details under it: what the notification says, with the specialist, the
// place and the payment as the booking is now. A thick line on the left
// marks the one under the pointer and the one open.

/** The booking as it is now, for an open notification. */
export interface NotificationVisit {
  row: VisitRow;
  /** The specialist's picture (initials where none). */
  avatar: string | null;
}

const DETAIL_TONES = {
  warning: "font-semibold text-[var(--warning)]",
  danger: "font-semibold text-[var(--danger)]",
  success: "font-semibold text-[var(--success)]",
  info: "text-[var(--info)]",
  neutral: "",
} as const;

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-h-6 grid-cols-[84px_minmax(0,1fr)] items-center gap-2 text-[0.75rem]">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="min-w-0 text-[var(--text)]">{children}</dd>
    </div>
  );
}

function Loading() {
  return (
    <span
      aria-hidden="true"
      className="block h-3 w-28 animate-pulse rounded bg-[var(--surface-muted)]"
    />
  );
}

/** The notification's own facts, with the booking's woven in. */
function Details({
  details,
  visit,
  showSpecialist,
}: {
  details: NotificationDetail[];
  /** undefined: not asked; "loading"; null: not found. */
  visit: NotificationVisit | null | "loading" | undefined;
  showSpecialist: boolean;
}) {
  const loading = visit === "loading";
  const row = visit && visit !== "loading" ? visit.row : null;
  const own = (detail: NotificationDetail) => (
    <Detail key={detail.label} label={detail.label}>
      <span className={cn(detail.tone && DETAIL_TONES[detail.tone])}>
        {detail.value}
      </span>
    </Detail>
  );
  const who =
    loading || row
      ? [
          showSpecialist ? (
            <Detail key="specjalista" label="Specjalista">
              {row ? (
                <SpecialistChip
                  avatar={visit !== "loading" ? visit?.avatar : null}
                  row={row}
                />
              ) : (
                <Loading />
              )}
            </Detail>
          ) : null,
          <Detail key="miejsce" label="Miejsce">
            {row ? <PlaceLabel row={row}>{row.place}</PlaceLabel> : <Loading />}
          </Detail>,
        ]
      : [];
  const payment =
    loading || row?.payment ? (
      <Detail key="platnosc" label="Płatność">
        {row?.payment ? (
          <Tag tone={row.payment.tone}>{row.payment.label}</Tag>
        ) : (
          <Loading />
        )}
      </Detail>
    ) : null;

  // The booking's specialist and place after the service; its payment
  // after the price (or after the place, when there is no price).
  const service = details.findIndex((d) => d.label === "Usługa");
  const price = details.findIndex((d) => d.label === "Cena");
  const out: ReactNode[] = [];
  details.forEach((detail, index) => {
    out.push(own(detail));
    if (index === service) out.push(...who);
    if (index === price) out.push(payment);
  });
  if (service < 0) out.push(...who);
  if (price < 0) out.push(payment);
  return <dl className="grid gap-px">{out}</dl>;
}

export function NotificationRow({
  item,
  unread,
  open,
  visit,
  showSpecialist = true,
  onToggle,
  onMark,
  onOpenBooking,
}: {
  item: NotificationView;
  unread: boolean;
  open: boolean;
  /** The booking as it is now (asked for when it is opened). */
  visit?: NotificationVisit | null | "loading";
  /** The specialist in the details (admins). */
  showSpecialist?: boolean;
  onToggle: () => void;
  /** The envelope: true read, false new again. */
  onMark: (read: boolean) => void;
  /** Leaving for the booking (the drawer closes). */
  onOpenBooking: () => void;
}) {
  const detailsId = `powiadomienie-${item.id}`;
  return (
    <article
      aria-label={item.title}
      className={cn(
        "group relative border-b border-[var(--border)] hover:shadow-[inset_3px_0_0_var(--primary)]",
        open
          ? "bg-[var(--surface)] shadow-[inset_3px_0_0_var(--primary)]"
          : unread
            ? "bg-[var(--primary-soft)]/60 hover:bg-[var(--surface-muted)]"
            : "hover:bg-[var(--surface-muted)]",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_26px] items-center gap-x-2 py-1.5 pr-1.5 pl-2.5">
        <button
          aria-controls={detailsId}
          aria-expanded={open}
          className="row-span-2 grid min-w-0 grid-cols-[20px_minmax(0,1fr)] gap-x-2 gap-y-px text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          onClick={onToggle}
          type="button"
        >
          <span className="row-span-2 mt-px">
            <KindIcon dim={!unread} icon={item.icon} tone={item.tone} />
          </span>
          <span className="flex h-[18px] min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "truncate text-[0.78125rem] text-[var(--text)]",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {item.title}
            </span>
            <NotificationBadges badges={item.badges} />
          </span>
          <span className="truncate text-[0.75rem] text-[var(--text-muted)]">
            {item.summary}
          </span>
        </button>
        <span className="h-[18px] text-right text-[0.71875rem] leading-[18px] text-[var(--text-subtle)] tabular-nums">
          {item.time}
        </span>
        <button
          aria-label={
            unread ? "Oznacz jako przeczytane" : "Oznacz jako nieprzeczytane"
          }
          className={cn(
            "col-start-3 row-span-2 row-start-1 grid size-[26px] place-items-center rounded-[5px] group-hover:ring-1 group-hover:ring-current focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
            unread
              ? "bg-[var(--info-soft)] text-[var(--info)]"
              : "text-[var(--text-subtle)] hover:text-[var(--text)]",
          )}
          onClick={() => onMark(unread)}
          title={
            unread
              ? "Nieprzeczytane · oznacz jako przeczytane"
              : "Przeczytane · oznacz jako nieprzeczytane"
          }
          type="button"
        >
          {unread ? (
            <Mail aria-hidden="true" className="size-[15px]" />
          ) : (
            <MailOpen aria-hidden="true" className="size-[15px]" />
          )}
        </button>
        {/* The number leads to the booking. */}
        {item.href && item.reference ? (
          <Link
            aria-label={`Rezerwacja ${item.reference}`}
            className="col-start-2 row-start-2 justify-self-end rounded-[3px] font-mono text-[0.6875rem] text-[var(--text-muted)] tabular-nums underline-offset-2 hover:text-[var(--primary)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
            href={item.href as Route}
            onClick={onOpenBooking}
          >
            {item.reference}
          </Link>
        ) : (
          <span className="col-start-2 row-start-2 text-right font-mono text-[0.6875rem] text-[var(--text-subtle)] tabular-nums">
            {item.reference}
          </span>
        )}
      </div>
      {/* Unfolds and folds smoothly; folded, it is out of reach. */}
      <div
        aria-hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        id={detailsId}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pr-3 pb-2.5 pl-2.5">
            <Details
              details={item.details}
              showSpecialist={showSpecialist}
              visit={visit}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
