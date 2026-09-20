import { logout } from "@/app/actions/auth";
import { requirePortalRole } from "@/lib/auth";
import {
  adminMobileNavigation,
  adminNavigation,
} from "@/lib/portal-navigation";
import { PortalShell } from "@repo/ui/portal-shell";
import { cookies } from "next/headers";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [authorization, cookieStore] = await Promise.all([
    requirePortalRole(),
    cookies(),
  ]);
  const displayName = [
    authorization.profile.first_name,
    authorization.profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <PortalShell
      brandSubtitle="Panel administracyjny"
      defaultSidebarOpen={
        cookieStore.get("kolor_sensu_sidebar")?.value !== "false"
      }
      logoutAction={logout}
      mobileNavigation={adminMobileNavigation}
      navigation={adminNavigation}
      portalSwitch={
        authorization.roles.includes("specialist")
          ? {
              label: "Przejdź do portalu specjalisty",
              href:
                process.env.NEXT_PUBLIC_SPECIALIST_URL ??
                "http://localhost:3002",
            }
          : undefined
      }
      profileHref="/ustawienia"
      user={{
        name: displayName || authorization.user.email || "Administrator",
        email: authorization.user.email,
        role: "Administrator centrum",
        imageUrl: authorization.profile.avatar_url ?? undefined,
      }}
    >
      {children}
    </PortalShell>
  );
}
