import type { HomeStoryMedia } from "@repo/contracts";

/** Manual references retain their order; missing/withdrawn references never leak drafts. */
export function selectStoryItems<T extends { id: string }>(
  items: readonly T[],
  media: Exclude<HomeStoryMedia, { type: "image" }>,
  limit: number,
): T[] {
  if (media.source === "auto") return items.slice(0, limit);
  return media.ids
    .flatMap((id) => {
      const item = items.find((one) => one.id === id);
      return item ? [item] : [];
    })
    .slice(0, limit);
}
