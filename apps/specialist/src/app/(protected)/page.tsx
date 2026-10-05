import { createClient } from "@/lib/supabase/server";
import {
  getMyDraft,
  getMyPublishedProfile,
  getMySpecialist,
  listAvailableServicesForSpecialist,
  listLocations,
  listMySpecialistServices,
} from "@repo/supabase";
import { SpecialistDashboard } from "@repo/ui/portal-dashboards";
import { unclosedVisitsSummary } from "@repo/supabase/visit-closing";
import {
  CalendarDays,
  ClipboardCheck,
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
    locations,
    availableServices,
    myServices,
    unclosed,
  ] = await Promise.all([
    specialist ? getMyPublishedProfile(client, specialist.id) : null,
    specialist ? getMyDraft(client, specialist.id) : null,
    listLocations(client),
    listAvailableServicesForSpecialist(client),
    listMySpecialistServices(client, specialist?.id),
    // Their visits that have ended and wait to be closed.
    specialist
      ? unclosedVisitsSummary(client, { own: true }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const toClose = unclosed.reduce((sum, one) => sum + one.visits, 0);
  const serviceById = new Map(
    availableServices.map((service) => [service.id, service]),
  );
  const currencyFormatter = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  });
  const attention = [
    ...(toClose
      ? [
          {
            id: "visits-to-close",
            title: `Wizyty do zamknięcia: ${toClose}`,
            description:
              "Zaznacz, czy się odbyły (albo klient nie przyszedł), i dodaj tagi.",
            icon: ClipboardCheck,
            tone: "warning" as const,
            href: "/rezerwacje?zakres=do-zamkniecia",
          },
        ]
      : []),
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
