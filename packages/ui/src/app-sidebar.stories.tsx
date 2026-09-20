import type { Meta, StoryObj } from "@storybook/react";
import {
  CalendarDays,
  Clock3,
  Home,
  Settings,
  Tag,
  UserRound,
} from "lucide-react";
import { AppSidebar } from "./portal-layout";

const meta = {
  title: "Portal/AppSidebar",
  component: AppSidebar,
  args: {
    sections: [
      {
        label: "PRACA",
        items: [
          { label: "Dashboard", href: "#", icon: Home, active: true },
          { label: "Mój kalendarz", href: "#", icon: CalendarDays },
          { label: "Dostępność", href: "#", icon: Clock3 },
        ],
      },
      {
        label: "OFERTA",
        items: [{ label: "Moje usługi i stawki", href: "#", icon: Tag }],
      },
      {
        label: "PROFIL",
        items: [{ label: "Mój profil", href: "#", icon: UserRound }],
      },
      {
        label: "KONTO",
        items: [{ label: "Ustawienia", href: "#", icon: Settings }],
      },
    ],
  },
  parameters: { canvasPadding: false },
} satisfies Meta<typeof AppSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SpecialistNavigation: Story = {};
