import type { OfferEntry, ServiceCatalog } from "@repo/contracts";

// The offer page in blocks: each run of services outside a catalogue as
// one grid, each catalogue as its own section; every block knows where its
// first service stands in the whole offer (the tiles' watercolors go on
// from it, as in one long list).

export interface OfferBlock<S> {
  catalog: ServiceCatalog | null;
  services: S[];
  from: number;
}

export function offerBlocks<
  S extends {
    id: string;
    name: string;
    sortOrder: number;
    catalogId: string | null;
  },
>(entries: OfferEntry<S, ServiceCatalog>[]): OfferBlock<S>[] {
  const blocks: OfferBlock<S>[] = [];
  let from = 0;
  for (const entry of entries) {
    if (entry.kind === "catalog") {
      blocks.push({ catalog: entry.catalog, services: entry.services, from });
      from += entry.services.length;
      continue;
    }
    const last = blocks.at(-1);
    if (last && !last.catalog) last.services.push(entry.service);
    else blocks.push({ catalog: null, services: [entry.service], from });
    from += 1;
  }
  return blocks;
}
