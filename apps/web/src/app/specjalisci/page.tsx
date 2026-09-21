import { createPublicClient } from "@/lib/supabase/public";
import {
  createSpecialistMediaSignedUrl,
  listPublishedSpecialists,
} from "@repo/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Specjaliści | Kolor Sensu",
  description: "Zespół specjalistów Kolor Sensu.",
};

export default async function SpecjalisciPage() {
  const client = createPublicClient();
  const specialists = await listPublishedSpecialists(client);
  const withPhotos = await Promise.all(
    specialists.map(async (specialist) => ({
      specialist,
      photoUrl: await createSpecialistMediaSignedUrl(
        client,
        specialist.profilePhotoUrl,
      ),
    })),
  );

  return (
    <div className="py-10">
      <Container>
        <h1 className="font-heading mb-6 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Specjaliści
        </h1>
        {withPhotos.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            Obecnie nie ma opublikowanych profili specjalistów.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {withPhotos.map(({ specialist, photoUrl }) => (
              <li key={specialist.specialistId}>
                <Card className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12">
                      {photoUrl ? <AvatarImage alt="" src={photoUrl} /> : null}
                      <AvatarFallback>
                        {specialist.displayName.slice(0, 2).toUpperCase() ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        className="font-semibold text-[var(--text)] hover:underline"
                        href={`/specjalisci/${specialist.publicSlug}`}
                      >
                        {specialist.displayName}
                      </Link>
                      {specialist.professionalTitle ? (
                        <p className="text-sm text-[var(--text-muted)]">
                          {specialist.professionalTitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {specialist.shortBio ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      {specialist.shortBio}
                    </p>
                  ) : null}
                  {specialist.acceptingNewClients ? (
                    <Badge variant="success">Przyjmuje nowych klientów</Badge>
                  ) : null}
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/specjalisci/${specialist.publicSlug}`}>
                      Szczegóły
                    </Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
