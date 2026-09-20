import { logout } from "@/app/actions/auth";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getCenterSettings,
  listLocations,
  listPendingSpecialistDrafts,
  listServicesAdmin,
  listSpecialistOffersAdmin,
  listSpecialistsForAdmin,
} from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";

export default async function Home() {
  const authorization = await requirePortalRole();
  const client = await createClient();
  const [
    specialists,
    pendingDrafts,
    centerSettings,
    locations,
    services,
    specialistOffers,
  ] = await Promise.all([
    listSpecialistsForAdmin(client),
    listPendingSpecialistDrafts(client),
    getCenterSettings(client),
    listLocations(client),
    listServicesAdmin(client),
    listSpecialistOffersAdmin(client),
  ]);
  const activeServiceCount = services.filter(
    (service) => service.active,
  ).length;
  const displayName = [
    authorization.profile.first_name,
    authorization.profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="flex min-h-screen items-center py-16">
      <Container>
        <Card>
          <p className="text-sm text-[var(--ks-color-text-muted)]">
            KOLOR SENSU · Centrum Psychoterapii
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Admin Portal</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Zalogowano jako {displayName || authorization.user.email}.
          </p>
          <div
            className="mt-5 flex flex-wrap gap-3"
            aria-label="Status domeny specjalistów"
          >
            <Badge variant="info">Specjaliści: {specialists.length}</Badge>
            <Badge variant={pendingDrafts.length > 0 ? "warning" : "neutral"}>
              Oczekujące szkice: {pendingDrafts.length}
            </Badge>
            <Badge variant="info">Centrum: {centerSettings.businessName}</Badge>
            <Badge variant="info">Lokalizacje: {locations.length}</Badge>
            <Badge variant="info">
              Usługi: {services.length} (aktywne: {activeServiceCount})
            </Badge>
            <Badge variant="info">
              Oferty specjalistów: {specialistOffers.length}
            </Badge>
          </div>
          <form action={logout} className="mt-6">
            <Button type="submit" variant="secondary">
              Wyloguj się
            </Button>
          </form>
        </Card>
      </Container>
    </main>
  );
}
