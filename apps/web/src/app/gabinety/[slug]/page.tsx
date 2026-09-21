import { createPublicClient } from "@/lib/supabase/public";
import { getPublicRoomBySlug, listPublicLocations } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const room = await getPublicRoomBySlug(createPublicClient(), slug);
  if (!room) {
    return { title: "Gabinet | Kolor Sensu" };
  }
  return {
    title: `${room.displayName} | Kolor Sensu`,
    description:
      room.shortDescription || `Gabinet ${room.displayName} w Kolor Sensu.`,
  };
}

export default async function RoomDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const client = createPublicClient();
  const room = await getPublicRoomBySlug(client, slug);
  if (!room) notFound();

  // listPublicLocations() is already the established, RLS-safe way to
  // read full public location fields (anon has a direct grant on
  // `locations`, unlike `rooms`) -- one more parallel-safe query, still a
  // small fixed number of reads for this one detail page, not per-item.
  const locations = await listPublicLocations(client);
  const location = locations.find((entry) => entry.slug === room.locationSlug);
  const addressParts = location
    ? [
        location.addressLine1,
        location.addressLine2,
        location.postalCode,
        location.city,
      ].filter((part): part is string => Boolean(part))
    : [];

  return (
    <div className="py-10">
      <Container className="space-y-8">
        <nav aria-label="Okruszki" className="text-sm text-[var(--text-muted)]">
          <Link className="hover:text-[var(--text)]" href="/">
            Strona główna
          </Link>{" "}
          /{" "}
          <Link className="hover:text-[var(--text)]" href="/gabinety">
            Gabinety
          </Link>{" "}
          / <span className="text-[var(--text)]">{room.displayName}</span>
        </nav>

        <div>
          <h1 className="font-heading text-3xl font-semibold text-[var(--text)] sm:text-4xl">
            {room.displayName}
          </h1>
          <p className="mt-1 text-[var(--text-muted)]">{room.locationName}</p>
          {addressParts.length > 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              {addressParts.join(", ")}
            </p>
          ) : null}
        </div>

        {room.longDescription || room.shortDescription ? (
          <section aria-labelledby="description-heading">
            <h2 className="sr-only" id="description-heading">
              Opis gabinetu
            </h2>
            <p className="whitespace-pre-line text-[var(--text)]">
              {room.longDescription || room.shortDescription}
            </p>
          </section>
        ) : null}

        {room.accessibilityNotes ? (
          <p className="text-sm text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text)]">Dostępność:</span>{" "}
            {room.accessibilityNotes}
          </p>
        ) : null}

        {room.amenities.length > 0 ? (
          <div>
            <h2 className="font-medium text-[var(--text)]">Udogodnienia</h2>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label="Udogodnienia">
              {room.amenities.map((amenity) => (
                <li key={amenity}>
                  <Badge variant="neutral">{amenity}</Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
