import { logout } from "@/app/actions/auth";
import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getMyDraft,
  getMyPublishedProfile,
  getMySpecialist,
} from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";

export default async function Home() {
  const authorization = await requirePortalRole();
  const client = await createClient();
  const specialist = await getMySpecialist(client, authorization.user.id);
  const [publishedProfile, draft] = specialist
    ? await Promise.all([
        getMyPublishedProfile(client, specialist.id),
        getMyDraft(client, specialist.id),
      ])
    : [null, null];
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
          <h1 className="mt-2 text-2xl font-semibold">Specialist Portal</h1>
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            Zalogowano jako {displayName || authorization.user.email}.
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[var(--text-muted)]">Tożsamość specjalisty</p>
              <Badge
                className="mt-2"
                variant={specialist ? "success" : "danger"}
              >
                {specialist ? "Połączona" : "Brak rekordu"}
              </Badge>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Profil publiczny</p>
              <Badge
                className="mt-2"
                variant={publishedProfile ? "success" : "neutral"}
              >
                {publishedProfile ? "Opublikowany" : "Nieopublikowany"}
              </Badge>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Ostatni szkic</p>
              <Badge
                className="mt-2"
                variant={
                  draft?.status === "pending_review" ? "warning" : "neutral"
                }
              >
                {draft?.status ?? "Brak"}
              </Badge>
            </div>
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
