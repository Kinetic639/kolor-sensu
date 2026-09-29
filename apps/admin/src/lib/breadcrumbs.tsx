import { adminNavigation } from "@/lib/portal-navigation";
import {
  PortalBreadcrumbTrail,
  portalBreadcrumbs,
} from "@repo/ui/portal-layout";
import Link from "next/link";

/**
 * The header trail for a path, rendered on the server by the
 * `@breadcrumb` slot; `detail` names what a detail page shows.
 */
export function AdminBreadcrumbs({
  pathname,
  detail,
}: {
  pathname: string;
  detail?: string | null;
}) {
  return (
    <PortalBreadcrumbTrail
      items={portalBreadcrumbs(adminNavigation, pathname, detail)}
      linkAs={Link}
    />
  );
}
