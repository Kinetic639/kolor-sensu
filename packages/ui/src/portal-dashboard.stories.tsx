import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, CalendarClock } from "lucide-react";
import {
  AppointmentListItem,
  AttentionItem,
  DashboardSection,
} from "./portal-dashboard";

const meta = {
  title: "Portal/Dashboard Primitives",
  component: DashboardSection,
  parameters: { controls: { disable: true } },
} satisfies Meta<typeof DashboardSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Appointment: Story = {
  args: { title: "Dzisiejsze wizyty", children: null },
  render: () => (
    <DashboardSection title="Dzisiejsze wizyty" className="max-w-2xl">
      <ol>
        <AppointmentListItem
          appointment={{
            id: "appointment-1",
            time: "09:00",
            duration: "50 min",
            clientName: "Julia Nowak",
            service: "Psychoterapia indywidualna",
            location: "Gabinet Zielony",
            status: "Potwierdzona",
            statusTone: "success",
          }}
        />
      </ol>
    </DashboardSection>
  ),
};

export const Attention: Story = {
  args: { title: "Wymaga uwagi", children: null },
  render: () => (
    <DashboardSection title="Wymaga uwagi" className="max-w-md">
      <ul>
        <AttentionItem
          item={{
            id: "attention-1",
            title: "Uzupełnij notatkę",
            description: "Wizyta z Julią Nowak · wczoraj, 17:00",
            icon: AlertTriangle,
            tone: "warning",
          }}
        />
        <AttentionItem
          item={{
            id: "attention-2",
            title: "Nowa rezerwacja",
            description: "Sprawdź szczegóły przed potwierdzeniem.",
            icon: CalendarClock,
            tone: "info",
          }}
        />
      </ul>
    </DashboardSection>
  ),
};
