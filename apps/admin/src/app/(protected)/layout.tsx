import { logout } from "@/app/actions/auth";
import {
  NotificationBell,
  NotificationPanel,
} from "@/features/notifications/bell";
import { LiveUpdates } from "@/features/notifications/live-updates";
import { requirePortalRole } from "@/lib/auth";
import {
  adminMobileNavigation,
  adminNavigation,
} from "@/lib/portal-navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalAvatarUrl } from "@repo/supabase";
import { PortalShell } from "@repo/ui/portal-shell";
import { parseTheme, THEME_COOKIE } from "@repo/ui/theme";
import { cookies } from "next/headers";

export default async function ProtectedLayout({
  children,
  breadcrumb,
}: Readonly<{ children: React.ReactNode; breadcrumb: React.ReactNode }>) {
  const [authorization, cookieStore, client] = await Promise.all([
    requirePortalRole(),
    cookies(),
    createClient(),
  ]);
  const displayName = [
    authorization.profile.first_name,
    authorization.profile.last_name,
  ]
    .filter(Boolean)
    .join(" ");
  // An admin who is also a specialist gets their "Mój profil" photo when the
  // account has no avatar of its own.
  const avatarUrl = authorization.roles.includes("specialist")
    ? await getPortalAvatarUrl(client, {
        userId: authorization.user.id,
        accountAvatarUrl: authorization.profile.avatar_url,
      })
    : authorization.profile.avatar_url;

  return (
    <PortalShell
      brandSubtitle="Panel administracyjny"
      breadcrumbs={breadcrumb}
      defaultSidebarOpen={
        cookieStore.get("kolor_sensu_sidebar")?.value !== "false"
      }
      logoutAction={logout}
      mobileNavigation={adminMobileNavigation}
      notifications={<NotificationBell />}
      notificationsPanel={<NotificationPanel />}
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
      theme={parseTheme(cookieStore.get(THEME_COOKIE)?.value)}
      user={{
        name: displayName || authorization.user.email || "Administrator",
        email: authorization.user.email,
        role: "Administrator centrum",
        imageUrl: avatarUrl ?? undefined,
      }}
    >
      {children}
      <LiveUpdates userId={authorization.user.id} />
    </PortalShell>
  );
}
