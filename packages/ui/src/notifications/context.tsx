"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// What the bell (in the header) and the panel (beside the page) share:
// whether the panel is open, and what the person marked here before the
// server's list says so (read, or new again).

interface NotificationsState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  /** Marked here, by id: true read, false new again. */
  marked: Readonly<Record<number, boolean>>;
  mark: (id: number, read: boolean) => void;
  /** All read here, with the unread count the server had then. */
  allReadAt: number | null;
  markAll: (ids: number[], unreadCount: number) => void;
}

const Context = createContext<NotificationsState | null>(null);

export function NotificationsProvider({
  children,
  defaultOpen = false,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [allReadAt, setAllReadAt] = useState<number | null>(null);
  const toggle = useCallback(() => setOpen((was) => !was), []);
  const mark = useCallback(
    (id: number, read: boolean) => setMarked((was) => ({ ...was, [id]: read })),
    [],
  );
  const markAll = useCallback((ids: number[], unreadCount: number) => {
    setMarked((was) => ({
      ...was,
      ...Object.fromEntries(ids.map((id) => [id, true])),
    }));
    setAllReadAt(unreadCount);
  }, []);
  const value = useMemo(
    () => ({ open, setOpen, toggle, marked, mark, allReadAt, markAll }),
    [open, toggle, marked, mark, allReadAt, markAll],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNotifications() {
  const state = useContext(Context);
  if (!state) {
    throw new Error("useNotifications needs a NotificationsProvider");
  }
  return state;
}

/** The shared state, or null outside a portal (e.g. alone in a test). */
export function useOptionalNotifications() {
  return useContext(Context);
}

/** Unread as marked here, else as the server says. */
export function isUnread(
  item: { id: number; unread: boolean },
  marked: Readonly<Record<number, boolean>>,
) {
  const read = marked[item.id];
  return read === undefined ? item.unread : !read;
}

/** How many are new: the server's count, with what was marked here. */
export function unreadNow(
  items: { id: number; unread: boolean }[],
  unreadCount: number,
  marked: Readonly<Record<number, boolean>>,
  allReadAt: number | null,
) {
  if (allReadAt !== null && allReadAt === unreadCount) {
    return items.filter((item) => marked[item.id] === false).length;
  }
  let count = unreadCount;
  for (const item of items) {
    const now = isUnread(item, marked);
    if (now !== item.unread) count += now ? 1 : -1;
  }
  return Math.max(0, count);
}
