import { createClient } from "@/lib/supabase/server";
import {
  listLocations,
  listPendingSpecialistDrafts,
  listServicesAdmin,
  listSpecialistOffersAdmin,
  listSpecialistsForAdmin,
} from "@repo/supabase";
import { AdminDashboard } from "@repo/ui/portal-dashboards";
import {
  AlertTriangle,
  Armchair,
  CalendarDays,
  Tags,
  Users,
} from "@repo/ui/portal-icons";

export default async function Home() {
  const client = await createClient();
  const [specialists, pendingDrafts, locations, services, specialistOffers] =
    await Promise.all([
      listSpecialistsForAdmin(client),
      listPendingSpecialistDrafts(client),
      listLocations(client),
      listServicesAdmin(client),
      listSpecialistOffersAdmin(client),
    ]);
  const activeSpecialists = specialists.filter(
    (specialist) => specialist.active,
  );
  const acceptingSpecialists = activeSpecialists.filter(
    (specialist) => specialist.acceptingNewClients,
  );
  const activeServices = services.filter((service) => service.active);
  const attention = pendingDrafts.length
    ? [
        {
          id: "pending-specialist-drafts",
          title: `${pendingDrafts.length} ${pendingDrafts.length === 1 ? "profil oczekuje" : "profile oczekują"} na weryfikację`,
          description:
            "Szkice profili specjalistów wymagają decyzji administratora.",
          icon: AlertTriangle,
          tone: "warning" as const,
        },
      ]
    : [];

  return (
    <AdminDashboard
      title="Centrum zarządzania ośrodkiem"
      metrics={[
        {
          id: "appointments",
          label: "Dzisiejsze wizyty",
          value: 0,
          icon: CalendarDays,
          tone: "blue",
          detail: "Dane pojawią się po wdrożeniu kalendarza",
        },
        {
          id: "specialists",
          label: "Aktywni specjaliści",
          value: activeSpecialists.length,
          icon: Users,
          tone: "mint",
          detail: `${acceptingSpecialists.length} przyjmuje nowych klientów`,
        },
        {
          id: "services",
          label: "Aktywne usługi",
          value: activeServices.length,
          icon: Tags,
          tone: "lilac",
          detail: `${specialistOffers.length} ofert specjalistów`,
        },
        {
          id: "locations",
          label: "Lokalizacje",
          value: locations.length,
          icon: Armchair,
          tone: "peach",
          detail: "Obłożenie po wdrożeniu grafików gabinetów",
        },
      ]}
      appointments={[]}
      attention={attention}
      rooms={[]}
      team={[
        {
          id: "active-specialists",
          title: "Aktywni specjaliści",
          description: `${specialists.length} wszystkich kont specjalistów`,
          value: String(activeSpecialists.length),
          icon: Users,
          tone: "success",
        },
        {
          id: "accepting-specialists",
          title: "Przyjmują nowych klientów",
          description: "Na podstawie aktualnego statusu profilu",
          value: String(acceptingSpecialists.length),
          icon: Users,
          tone: "info",
        },
      ]}
      events={[]}
    />
  );
}
