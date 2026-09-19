import { CalendarDays, FileText, MessageSquareText } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";
import { NotificationDrawer, NotificationItem } from "./notification";

const meta = {
  title: "Portal/Notifications",
  component: NotificationDrawer,
  args: { children: null },
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof NotificationDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

function NotificationList() {
  return (
    <>
      <NotificationItem
        category="Wizyta"
        description="Katarzyna Nowak zarezerwowała wizytę na środę o 16:00."
        icon={CalendarDays}
        time="10:24"
        title="Nowa rezerwacja: konsultacja psychologiczna"
        unread
      />
      <NotificationItem
        category="Profil"
        description="Zmiany w opisie specjalizacji oczekują na akceptację."
        icon={FileText}
        time="Wczoraj"
        title="Zmiany w profilu oczekują na akceptację"
        tone="lilac"
      />
      <NotificationItem
        category="Wiadomość"
        description="Anna Wiśniewska wysłała nową wiadomość przez portal."
        icon={MessageSquareText}
        time="09.04"
        title="Nowa wiadomość od klienta"
        tone="blue"
        unread
      />
    </>
  );
}

export const Item: Story = {
  render: () => (
    <div className="max-w-xl space-y-2">
      <NotificationList />
    </div>
  ),
};

export const DesktopDrawer: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
  render: () => (
    <NotificationDrawer
      count={10}
      defaultOpen
      trigger={<Button>Otwórz powiadomienia</Button>}
    >
      <NotificationList />
    </NotificationDrawer>
  ),
};

export const MobileDrawer: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => (
    <NotificationDrawer
      count={10}
      defaultOpen
      side="bottom"
      trigger={<Button>Otwórz powiadomienia</Button>}
    >
      <NotificationList />
    </NotificationDrawer>
  ),
};
