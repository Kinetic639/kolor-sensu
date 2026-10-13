import type { PublicSupportArea } from "@repo/supabase";
import type { SupportAreaItem } from "@repo/ui/public-site";

/**
 * The homepage's areas of help: the CMS's once published, the site's own
 * until then. An area without a link of its own leads to booking.
 */
export function toSupportAreaItems(
  published: readonly PublicSupportArea[] | null,
  site: readonly PublicSupportArea[],
  booking: { href: string; label: string },
): SupportAreaItem[] {
  return (published ?? site).map((area) => ({
    id: area.id,
    title: area.title,
    lead: area.lead,
    image: area.image,
    href: area.link?.href ?? booking.href,
    linkLabel: area.link?.label ?? booking.label,
  }));
}
