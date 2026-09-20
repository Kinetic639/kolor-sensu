import type { Meta, StoryObj } from "@storybook/react";
import { AppHeader } from "./app-header";

const meta = {
  title: "Portal/AppHeader",
  component: AppHeader,
  args: {
    user: {
      name: "Anna Kowalska",
      role: "Psychoterapeutka",
      email: "anna@example.com",
    },
    notificationCount: 3,
    profileHref: "/profil",
    portalSwitch: {
      label: "Przejdź do panelu administratora",
      href: "http://localhost:3001",
    },
  },
  parameters: { canvasPadding: false },
} satisfies Meta<typeof AppHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  globals: { viewport: { value: "desktop", isRotated: false } },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};
