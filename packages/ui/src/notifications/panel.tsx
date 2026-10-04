"use client";

import { notificationDays, type NotificationView } from "@repo/scheduling";
import { MailOpen, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../icon-action";
import { cn } from "../lib/utils";
import { TooltipProvider } from "../tooltip";
import { isUnread, unreadNow, useNotifications } from "./context";
import { NotificationRow, type NotificationVisit } from "./row";

// The notifications drawer (R13): slides in from the right over the page
// (dimmed behind it), opened by the bell; Escape, the close button or a
// click outside close it. "Nowe" first when there are any, "Wszystkie" by
// day. A click
// opens a notification's booking details under it and reads it; the
// envelope reads it or makes it new again; one button reads them all.
// What is marked shows at once; the server follows and the page reloads.

type Tab = "nowe" | "wszystkie";

export interface NotificationsPanelProps {
  items: NotificationView[];
  /** The server's unread count (more than the list may show). */
  unreadCount?: number;
  markRead: (id: number) => Promise<unknown>;
  markUnread: (id: number) => Promise<unknown>;
  markAllRead: () => Promise<unknown>;
  /**
   * The booking as it is now, asked for when a notification is opened
   * (a server action); without it, the notification's own facts only.
   */
  loadVisit?: (visitId: string) => Promise<NotificationVisit | null>;
  /** The specialist in the details (admins). */
  showSpecialist?: boolean;
  /** The specialists' pictures and colours, by id (a profile's chip). */
  look?: Record<string, { avatar: string | null; color: string | null }>;
}

export function NotificationsPanel({
  items,
  unreadCount = items.filter((item) => item.unread).length,
  markRead,
  markUnread,
  markAllRead,
  loadVisit,
  showSpecialist = true,
  look,
}: NotificationsPanelProps) {
  const router = useRouter();
  const { open, setOpen, marked, mark, allReadAt, markAll } =
    useNotifications();
  const count = unreadNow(items, unreadCount, marked, allReadAt);
  const [tab, setTab] = useState<Tab>("nowe");
  // "Nowe" keeps what was new when it was shown: a notification read
  // there stays until the tab is shown again (it does not jump away).
  const [shownNew, setShownNew] = useState<ReadonlySet<number>>(new Set());
  const [expanded, setExpanded] = useState<number | null>(null);
  const drawer = useRef<HTMLDivElement>(null);
  // Bookings asked for, by id: kept while the page is open.
  const [visits, setVisits] = useState<
    Record<string, NotificationVisit | null | "loading">
  >({});
  const askVisit = (visitId: string | null) => {
    if (!loadVisit || !visitId || visits[visitId] !== undefined) return;
    setVisits((was) => ({ ...was, [visitId]: "loading" }));
    loadVisit(visitId)
      .catch(() => null)
      .then((visit) => setVisits((was) => ({ ...was, [visitId]: visit })));
  };
  const live = useRef({ items, marked });
  live.current = { items, marked };

  const showTab = (next: Tab) => {
    setTab(next);
    if (next === "nowe") {
      const { items: now, marked: done } = live.current;
      setShownNew(
        new Set(now.filter((item) => isUnread(item, done)).map((i) => i.id)),
      );
    }
  };

  // Opened: the new ones first, if there are any.
  useEffect(() => {
    if (!open) return;
    const { items: now, marked: done } = live.current;
    const fresh = now.filter((item) => isUnread(item, done));
    setTab(fresh.length ? "nowe" : "wszystkie");
    setShownNew(new Set(fresh.map((item) => item.id)));
    setExpanded(null);
  }, [open]);

  const setRead = (item: NotificationView, read: boolean) => {
    if (isUnread(item, marked) === !read) return;
    mark(item.id, read);
    void (read ? markRead(item.id) : markUnread(item.id)).then(() =>
      router.refresh(),
    );
  };
  const readAll = () => {
    markAll(
      items.map((item) => item.id),
      unreadCount,
    );
    void markAllRead().then(() => router.refresh());
  };

  const shown =
    tab === "nowe" ? items.filter((item) => shownNew.has(item.id)) : items;

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--text)_28%,transparent)] backdrop-blur-[2px] data-[state=closed]:animate-[ks-fade-out_160ms_ease-in_forwards] data-[state=open]:animate-[ks-fade-in_200ms_ease-out] motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-overlay)] outline-none data-[state=closed]:animate-[ks-drawer-out_180ms_ease-in_forwards] data-[state=open]:animate-[ks-drawer-in_240ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none"
          id="powiadomienia"
          ref={drawer}
          // Focus on the drawer itself, not its first button: a button
          // focused on opening would show its tooltip unasked.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            drawer.current?.focus();
          }}
          // Escape folds the open notification first, then closes.
          onEscapeKeyDown={(event) => {
            if (expanded !== null) {
              event.preventDefault();
              setExpanded(null);
            }
          }}
        >
          <header className="flex h-11 shrink-0 items-center gap-0.5 border-b border-[var(--border)] pr-1.5 pl-3">
            <Dialog.Title className="text-[0.9375rem] leading-tight font-semibold text-[var(--text)]">
              Powiadomienia
            </Dialog.Title>
            {/* How many are new; (0) says none. */}
            <span
              aria-label={`nowe: ${count}`}
              className="mr-auto ml-1.5 text-[0.875rem] font-medium text-[var(--text-muted)] tabular-nums"
            >
              ({count})
            </span>
            {count ? (
              <IconButton
                icon={<MailOpen aria-hidden="true" />}
                label="Oznacz wszystkie jako przeczytane"
                onClick={readAll}
              />
            ) : null}
            <IconButton
              icon={<X aria-hidden="true" />}
              label="Zamknij powiadomienia"
              onClick={() => setOpen(false)}
            />
          </header>

          <div
            aria-label="Które powiadomienia"
            className="flex h-8 shrink-0 items-stretch gap-3.5 border-b border-[var(--border)] px-3"
            role="tablist"
          >
            {(["nowe", "wszystkie"] as const).map((key) => (
              <button
                aria-controls="powiadomienia-lista"
                aria-selected={tab === key}
                className={cn(
                  "flex items-center gap-1.5 text-[0.8125rem] outline-none focus-visible:underline",
                  tab === key
                    ? "font-medium text-[var(--text)] shadow-[inset_0_-2px_0_var(--primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text)]",
                )}
                key={key}
                onClick={() => showTab(key)}
                role="tab"
                type="button"
              >
                {key === "nowe" ? "Nowe" : "Wszystkie"}
                {key === "nowe" && count ? (
                  <span
                    className={cn(
                      "rounded-[4px] px-1.5 text-[0.65625rem] font-medium tabular-nums",
                      tab === key
                        ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <TooltipProvider delayDuration={200}>
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              id="powiadomienia-lista"
              role="tabpanel"
            >
              {shown.length ? (
                notificationDays(shown).map((group) => (
                  <section aria-label={group.day} key={group.day}>
                    <h3 className="sticky top-0 z-[1] flex h-6 items-center border-b border-[var(--border)] bg-[var(--surface-subtle)] px-3 text-[0.6875rem] font-semibold tracking-[0.03em] text-[var(--text-muted)]">
                      {group.day}
                    </h3>
                    {group.items.map((item) => (
                      <NotificationRow
                        item={item}
                        key={item.id}
                        look={look}
                        onMark={(read) => setRead(item, read)}
                        onOpenBooking={() => {
                          setRead(item, true);
                          setOpen(false);
                        }}
                        onToggle={() => {
                          if (expanded === item.id) {
                            setExpanded(null);
                          } else {
                            setExpanded(item.id);
                            setRead(item, true);
                            askVisit(item.visitId);
                          }
                        }}
                        open={expanded === item.id}
                        showSpecialist={showSpecialist}
                        unread={isUnread(item, marked)}
                        visit={item.visitId ? visits[item.visitId] : undefined}
                      />
                    ))}
                  </section>
                ))
              ) : tab === "nowe" ? (
                <div className="m-3 grid justify-items-center gap-1.5 rounded-md border border-[var(--border)] px-4 py-7 text-center">
                  <span className="grid size-8 place-items-center rounded-lg bg-[var(--success-soft)] text-[var(--success)]">
                    <MailOpen aria-hidden="true" className="size-4" />
                  </span>
                  <p className="text-[0.8125rem] font-semibold text-[var(--text)]">
                    Wszystko przeczytane
                  </p>
                  <p className="max-w-[34ch] text-[0.75rem] text-[var(--text-muted)]">
                    Nowe rezerwacje, odwołania, płatności i zmiany terminów
                    pojawią się tutaj.
                  </p>
                  <button
                    className="mt-1 inline-flex h-6 items-center rounded-[5px] border border-[var(--border)] px-2.5 text-[0.75rem] font-medium text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none"
                    onClick={() => showTab("wszystkie")}
                    type="button"
                  >
                    Pokaż wszystkie
                  </button>
                </div>
              ) : (
                <p className="px-3 py-8 text-center text-[0.8125rem] text-[var(--text-muted)]">
                  Brak powiadomień. Pojawią się tu nowe rezerwacje, odwołania i
                  zmiany terminów.
                </p>
              )}
            </div>
          </TooltipProvider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
