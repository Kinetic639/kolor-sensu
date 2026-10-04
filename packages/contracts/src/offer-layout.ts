// The offer's layout, as the site's menu and the admin's lists show it:
// one list of the services outside a catalogue and of the catalogues
// (both by their place), each catalogue with its own services (by
// theirs). The same place: by name. Pure, for the site and the portal.

export interface ServiceCatalog {
  id: string;
  name: string;
  sortOrder: number;
}

interface Placed {
  id: string;
  name: string;
  sortOrder: number;
  catalogId: string | null;
}

export type OfferEntry<S extends Placed, C extends ServiceCatalog> =
  | { kind: "service"; service: S }
  | { kind: "catalog"; catalog: C; services: S[] };

const collator = new Intl.Collator("pl");
const byPlace = (
  a: { sortOrder: number; name: string },
  b: { sortOrder: number; name: string },
) => a.sortOrder - b.sortOrder || collator.compare(a.name, b.name);

export function arrangeOffer<S extends Placed, C extends ServiceCatalog>(
  services: S[],
  catalogs: C[],
  { keepEmpty = false }: { keepEmpty?: boolean } = {},
): OfferEntry<S, C>[] {
  const known = new Set(catalogs.map((catalog) => catalog.id));
  const inside = (service: S) =>
    service.catalogId !== null && known.has(service.catalogId);
  const top = [
    ...services
      .filter((service) => !inside(service))
      .map((service) => ({
        sortOrder: service.sortOrder,
        name: service.name,
        entry: { kind: "service", service } as OfferEntry<S, C>,
      })),
    ...catalogs.flatMap((catalog) => {
      const own = services
        .filter((service) => service.catalogId === catalog.id)
        .sort(byPlace);
      return own.length || keepEmpty
        ? [
            {
              sortOrder: catalog.sortOrder,
              name: catalog.name,
              entry: {
                kind: "catalog",
                catalog,
                services: own,
              } as OfferEntry<S, C>,
            },
          ]
        : [];
    }),
  ];
  return top.sort(byPlace).map((one) => one.entry);
}

/** The services in the offer's order, each with its catalogue (or none). */
export function flattenOffer<S extends Placed, C extends ServiceCatalog>(
  entries: OfferEntry<S, C>[],
): { service: S; catalog: C | null }[] {
  return entries.flatMap((entry): { service: S; catalog: C | null }[] =>
    entry.kind === "service"
      ? [{ service: entry.service, catalog: null }]
      : entry.services.map((service) => ({ service, catalog: entry.catalog })),
  );
}

/** A catalogue's place on the offer's page: `Dzieci i młodzież` → `dzieci-i-mlodziez`. */
export function catalogAnchor(name: string) {
  return (
    name
      .toLocaleLowerCase("pl-PL")
      .replace(/ł/g, "l")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "katalog"
  );
}
