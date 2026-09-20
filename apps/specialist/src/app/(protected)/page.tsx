import { createClient } from "@/lib/supabase/server";
import {
  getCenterPublicProfile,
  getMyDraft,
  getMyPublishedProfile,
  getMySpecialist,
  listAvailableServicesForSpecialist,
  listLocations,
  listMySpecialistServices,
} from "@repo/supabase";
import { SpecialistDashboard } from "@repo/ui/portal-dashboards";
import {
  CalendarDays,
  CircleAlert,
  Clock3,
  FileText,
  Tags,
  UserRound,
} from "@repo/ui/portal-icons";

export default async function Home() {
  const client = await createClient();
  const specialist = await getMySpecialist(client);
  const [
    publishedProfile,
    draft,
    centerProfile,
    locations,
    availableServices,
    myServices,
  ] = await Promise.all([
    specialist ? getMyPublishedProfile(client, specialist.id) : null,
    specialist ? getMyDraft(client, specialist.id) : null,
    getCenterPublicProfile(client),
    listLocations(client),
    listAvailableServicesForSpecialist(client),
    listMySpecialistServices(client, specialist?.id),
  ]);
  const serviceById = new Map(
    availableServices.map((service) => [service.id, service]),
  );
  const currencyFormatter = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  });
  const attention = [
    ...(!specialist
      ? [
          {
            id: "missing-specialist",
            title: "Brak profilu specjalisty",
            description: "Skontaktuj się z administratorem centrum.",
            icon: CircleAlert,
            tone: "danger" as const,
          },
        ]
      : []),
    ...(specialist && !publishedProfile
      ? [
          {
            id: "unpublished-profile",
            title: "Profil nie jest opublikowany",
            description: "Uzupełnij profil i prześlij go do weryfikacji.",
            icon: UserRound,
            tone: "warning" as const,
          },
        ]
      : []),
    ...(draft?.status === "pending_review"
      ? [
          {
            id: "pending-profile",
            title: "Profil oczekuje na weryfikację",
            description: "Administrator centrum sprawdzi przesłany szkic.",
            icon: FileText,
            tone: "info" as const,
          },
        ]
      : []),
  ];

  return (
    <SpecialistDashboard
      title="Panel główny"
      description={`${centerProfile?.displayName ?? "Kolor Sensu"} · podsumowanie Twojego profilu i oferty`}
      dateLabel={new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "long",
      }).format(new Date())}
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
          id: "availability",
          label: "Dostępność",
          value: "—",
          icon: Clock3,
          tone: "mint",
          detail: "Moduł dostępności nie jest jeszcze wdrożony",
        },
        {
          id: "services",
          label: "Aktywne usługi",
          value: myServices.filter((service) => service.active).length,
          icon: Tags,
          tone: "lilac",
          detail: `${myServices.length} wszystkich przypisanych usług`,
        },
        {
          id: "locations",
          label: "Lokalizacje centrum",
          value: locations.length,
          icon: UserRound,
          tone: "peach",
          detail: "Dostępne lokalizacje ośrodka",
        },
      ]}
      appointments={[]}
      attention={attention}
      availability={[]}
      services={myServices.map((offer) => {
        const service = serviceById.get(offer.serviceId);
        const duration =
          offer.durationMinutes ?? service?.defaultDurationMinutes;

        return {
          id: offer.id,
          title: service?.name ?? "Usługa",
          description: duration ? `${duration} min` : "Czas nieustalony",
          value: currencyFormatter.format(offer.priceMinor / 100),
          icon: Tags,
          tone: offer.active ? ("success" as const) : ("neutral" as const),
        };
      })}
      events={[]}
    />
  );
}
