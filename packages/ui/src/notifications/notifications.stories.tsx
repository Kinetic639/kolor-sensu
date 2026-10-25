import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { NotificationsBell } from "./bell";
import { NotificationsProvider } from "./context";
import { NotificationsPanel } from "./panel";
import {
  sampleNotifications,
  sampleUnreadCount,
} from "./notifications.samples";

// The notifications panel beside the page (direction C): new ones first,
// all by day, two short lines each with the facts as icons, the booking's
// details under the one opened, the envelope for read or new.

const markRead = fn(async () => true);
const markUnread = fn(async () => true);
const markAllRead = fn(async () => 3);

function Inbox({ empty = false }: { empty?: boolean }) {
  const items = empty ? [] : sampleNotifications;
  return (
    <NotificationsProvider defaultOpen>
      <div className="flex h-[40rem] border border-[var(--border)] bg-[var(--surface)] [--ks-header-height:0px]">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-10 items-center justify-end border-b border-[var(--border)] px-3">
            <NotificationsBell
              items={items}
              unreadCount={empty ? 0 : sampleUnreadCount}
            />
          </div>
          <p className="p-4 text-sm text-[var(--text-muted)]">
            Strona obok panelu działa dalej.
          </p>
        </div>
        <NotificationsPanel
          items={items}
          markAllRead={markAllRead}
          markRead={markRead}
          markUnread={markUnread}
        />
      </div>
    </NotificationsProvider>
  );
}

const meta = {
  title: "Portal/Notifications",
  component: Inbox,
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    nextjs: { appDirectory: true },
  },
  decorators: [
    (Story) => (
      <div className="p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Inbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Three new ones; a click opens one under it and reads it. */
export const New: Story = {
  play: async ({ canvasElement }) => {
    const panel = within(canvasElement.ownerDocument.body).getByRole("dialog", {
      name: "Powiadomienia",
    });
    const first = within(panel).getAllByRole("article")[0]!;
    await userEvent.click(
      within(first).getByRole("button", { name: /Nowa rezerwacja/ }),
    );
    // The booking's number leads to it (no separate button below).
    await expect(
      await within(first).findByRole("link", { name: "Rezerwacja 2610-027" }),
    ).toBeVisible();
    await expect(markRead).toHaveBeenCalledWith(1);
  },
};

/** Every one, by day; the envelopes read or make new again. */
export const All: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole("tab", { name: "Wszystkie" }));
    await expect(page.getAllByRole("article")).toHaveLength(7);
  },
};

/** Nothing yet. */
export const Empty: Story = { args: { empty: true } };

/** On a phone: over the page, the whole width. */
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
