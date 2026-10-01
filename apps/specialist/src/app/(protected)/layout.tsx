import { logout } from "@/app/actions/auth";
import { NotificationBell } from "@/features/notifications/bell";
import { LiveUpdates } from "@/features/notifications/live-updates";
import { requirePortalRole } from "@/lib/auth";
import {
  specialistMobileNavigation,
  specialistNavigation,
} from "@/lib/portal-navigation";
import { createClient } from "@/lib/supabase/server";
import { getPortalAvatarUrl } from "@repo/supabase";
import { PortalShell } from "@repo/ui/portal-shell";
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
  // Without an account avatar, the photo from "Mój profil" is shown.
  const avatarUrl = await getPortalAvatarUrl(client, {
    userId: authorization.user.id,
    accountAvatarUrl: authorization.profile.avatar_url,
  });

  return (
    <PortalShell
      brandSubtitle="Portal specjalisty"
      breadcrumbs={breadcrumb}
      defaultSidebarOpen={
        cookieStore.get("kolor_sensu_sidebar")?.value !== "false"
      }
      logoutAction={logout}
      mobileNavigation={specialistMobileNavigation}
      notifications={<NotificationBell />}
      navigation={specialistNavigation}
      portalSwitch={
        authorization.roles.includes("admin")
          ? {
              label: "Przejdź do panelu administratora",
              href:
                process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001",
            }
          : undefined
      }
      profileHref="/profil"
      user={{
        name: displayName || authorization.user.email || "Specjalista",
        email: authorization.user.email,
        role: "Specjalista",
        imageUrl: avatarUrl ?? undefined,
      }}
    >
      {children}
      <LiveUpdates userId={authorization.user.id} />
    </PortalShell>
  );
}
