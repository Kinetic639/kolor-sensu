import { workshopWayThere } from "./workshop-view";

// A workshop's place in its facts (its page, the registration's page): the
// place, then how to get there and the maps, when held in place (#211).

export function WorkshopPlace({
  place,
  modality,
  locationName,
  locationAddress,
  locationDirections,
}: {
  /** The words for the place, e.g. "Kolor Sensu, ul. Spokojna 1 (Sala duża)". */
  place: string;
  modality: "in_person" | "online";
  locationName: string | null;
  locationAddress: string | null;
  locationDirections: string | null;
}) {
  const way = workshopWayThere({
    modality,
    locationName,
    locationAddress,
    locationDirections,
  });
  if (!way) return place;
  return (
    <span className="grid gap-1">
      <span>{place}</span>
      {way.directions ? (
        <span className="text-small text-text-muted">{way.directions}</span>
      ) : null}
      <a
        className="text-small text-primary-strong font-semibold underline"
        href={way.mapsHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        Otwórz w mapach
        <span className="sr-only"> (nowa karta)</span>
      </a>
    </span>
  );
}
