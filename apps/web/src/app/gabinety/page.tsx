import { isRichTextEmpty, type PublicLocation } from "@repo/contracts";
import { RoomGallery, SoftCard } from "@repo/ui/public-site";
import { RichTextRenderer } from "@repo/ui/rich-text-renderer";
import { Accessibility, Check, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { ClosingCta } from "@/components/closing-cta";
import { PageIntro } from "@/components/page-intro";
import {
  getClosingCta,
  getLocations,
  getRoomsByLocation,
  getRoomsPageContent,
} from "@/lib/public-data";
import type { RoomsPageRoom } from "@/lib/rooms-by-location";
import { pageMetadata } from "@/lib/page-metadata";

// Title, description and link preview: the CMS's over the page's own.
export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("rooms");
}

function formatAddress(location: PublicLocation) {
  return [
    [location.addressLine1, location.addressLine2].filter(Boolean).join(", "),
    [location.postalCode, location.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function LocationDetails({ location }: { location: PublicLocation }) {
  const address = formatAddress(location);
  return (
    <div className="grid gap-4">
      {address ? (
        <p className="text-body text-text-muted flex items-start gap-2">
          <MapPin
            className="text-primary mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          {address}
        </p>
      ) : null}
      {location.publicDescription ? (
        <p className="text-body text-ink max-w-copy whitespace-pre-line">
          {location.publicDescription}
        </p>
      ) : null}
      {location.amenities.length > 0 ? (
        <ul
          aria-label={`Udogodnienia: ${location.name}`}
          className="text-body flex flex-wrap gap-x-6 gap-y-2"
        >
          {location.amenities.map((amenity) => (
            <li key={amenity} className="flex items-center gap-2">
              <Check
                className="text-primary size-4 shrink-0"
                aria-hidden="true"
              />
              {amenity}
            </li>
          ))}
        </ul>
      ) : null}
      {location.accessibilityNotes ? (
        <p className="text-body text-text-muted flex items-start gap-2">
          <Accessibility
            className="text-primary mt-1 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>
            <span className="text-ink font-semibold">Dostępność: </span>
            {location.accessibilityNotes}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function RoomCard({
  room,
  headingLevel,
}: {
  room: RoomsPageRoom;
  /** h3 under a location's heading, h2 when locations are hidden. */
  headingLevel: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <article className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
      <RoomGallery
        label={`Zdjęcia: ${room.displayName}`}
        photos={room.photos}
      />
      <div className="grid content-start gap-3">
        <Heading className="font-display text-h3 text-ink">
          {room.displayName}
        </Heading>
        {room.shortDescription ? (
          <p className="text-lead text-text-muted">{room.shortDescription}</p>
        ) : null}
        {isRichTextEmpty(room.longDescription) ? null : (
          <RichTextRenderer
            className="text-body text-ink max-w-copy [&_a]:text-primary-strong [&_blockquote]:border-primary [&_h2]:font-display [&_h2]:text-title [&_h3]:font-display [&_h3]:text-title [&>:first-child]:mt-0"
            document={room.longDescription}
          />
        )}
      </div>
    </article>
  );
}

export default async function RoomsPage() {
  const [groups, locations, content, closing] = await Promise.all([
    getRoomsByLocation(),
    getLocations(),
    getRoomsPageContent(),
    getClosingCta(),
  ]);
  const { intro } = content;
  // No room yet: the locations stand in (when their details show), and a
  // line says the rooms are coming; never an empty page.
  const noRooms = groups.length === 0;
  const showLocationsAlone =
    noRooms && content.showLocationDetails && locations.length > 0;

  return (
    <>
      <PageIntro header={intro} />
      {content.showAmenitiesSection && content.amenities.length > 0 ? (
        <section className="max-w-page px-gutter pb-section-sm mx-auto">
          <SoftCard className="grid gap-4 p-6 lg:p-8">
            <h2 className="font-display text-h3 text-ink">
              {content.amenitiesHeading}
            </h2>
            <ul className="text-body grid gap-2.5 sm:grid-cols-2">
              {content.amenities.map((point) => (
                <li key={point} className="flex gap-3">
                  <Check
                    className="text-primary mt-1 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </SoftCard>
        </section>
      ) : null}

      {groups.map(({ location, rooms: locationRooms }) => (
        <section
          aria-labelledby={
            content.showLocationDetails ? `location-${location.id}` : undefined
          }
          className="max-w-page px-gutter pb-section-sm mx-auto grid gap-10"
          key={location.id}
        >
          {content.showLocationDetails ? (
            <SoftCard className="grid gap-4 p-6 lg:p-8">
              <h2
                className="font-display text-h2 text-ink"
                id={`location-${location.id}`}
              >
                {location.name}
              </h2>
              <LocationDetails location={location} />
            </SoftCard>
          ) : null}
          <div className="grid gap-14">
            {locationRooms.map((room) => (
              <RoomCard
                headingLevel={content.showLocationDetails ? "h3" : "h2"}
                key={room.roomId}
                room={room}
              />
            ))}
          </div>
        </section>
      ))}

      {noRooms ? (
        <section className="max-w-page px-gutter pb-section-sm mx-auto">
          <p className="text-body text-text-muted max-w-copy">
            {content.emptyText}
          </p>
        </section>
      ) : null}
      {showLocationsAlone ? (
        <section className="max-w-page px-gutter pb-section-sm mx-auto grid gap-6 md:grid-cols-2">
          {locations.map((location) => (
            <SoftCard key={location.id} className="grid gap-4 p-6">
              <h2 className="font-display text-h3 text-ink">{location.name}</h2>
              <LocationDetails location={location} />
            </SoftCard>
          ))}
        </section>
      ) : null}
      <ClosingCta words={closing} />
    </>
  );
}
