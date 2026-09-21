import { createPublicClient } from "@/lib/supabase/public";
import { groupPublicRoomsByLocation } from "@repo/contracts";
import { listPublicRooms } from "@repo/supabase";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gabinety | Kolor Sensu",
  description: "Gabinety Kolor Sensu w poszczególnych lokalizacjach.",
};

export default async function GabinetyPage() {
  const client = createPublicClient();
  // Exactly two queries total (see listPublicRooms): room_public_profiles
  // + the list_public_room_locations() bridge -- no query per room.
  const rooms = await listPublicRooms(client);
  const groups = groupPublicRoomsByLocation(rooms);

  return (
    <div className="py-10">
      <Container>
        <h1 className="font-heading mb-6 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
          Gabinety
        </h1>
        {groups.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            Informacje o gabinetach są obecnie aktualizowane.
          </p>
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section
                aria-labelledby={`location-${group.locationId}`}
                key={group.locationId}
              >
                <h2
                  className="font-heading mb-4 text-xl font-semibold text-[var(--text)]"
                  id={`location-${group.locationId}`}
                >
                  {group.locationName}
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {group.rooms.map((room) => (
                    <li key={room.roomId}>
                      <Card className="space-y-3 p-5">
                        <h3 className="font-heading text-lg font-semibold text-[var(--text)]">
                          <Link
                            className="hover:underline"
                            href={`/gabinety/${room.roomSlug}`}
                          >
                            {room.displayName}
                          </Link>
                        </h3>
                        {room.shortDescription ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            {room.shortDescription}
                          </p>
                        ) : null}
                        {room.accessibilityNotes ? (
                          <p className="text-sm text-[var(--text-muted)]">
                            <span className="font-medium text-[var(--text)]">
                              Dostępność:
                            </span>{" "}
                            {room.accessibilityNotes}
                          </p>
                        ) : null}
                        {room.amenities.length > 0 ? (
                          <ul
                            className="flex flex-wrap gap-2"
                            aria-label="Udogodnienia"
                          >
                            {room.amenities.map((amenity) => (
                              <li key={amenity}>
                                <Badge variant="neutral">{amenity}</Badge>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/gabinety/${room.roomSlug}`}>
                            Szczegóły
                          </Link>
                        </Button>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
