import { specialistNavigation } from "@/lib/portal-navigation";
import {
  PortalBreadcrumbTrail,
  portalBreadcrumbs,
} from "@repo/ui/portal-layout";
import Link from "next/link";

/** The header trail for a path, rendered on the server by `@breadcrumb`. */
export function SpecialistBreadcrumbs({
  pathname,
  detail,
}: {
  pathname: string;
  detail?: string | null;
}) {
  return (
    <PortalBreadcrumbTrail
      items={portalBreadcrumbs(specialistNavigation, pathname, detail)}
      linkAs={Link}
    />
  );
}
