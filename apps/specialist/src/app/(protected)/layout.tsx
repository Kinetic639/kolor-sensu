import { logout } from "@/app/actions/auth";
import { requirePortalRole } from "@/lib/auth";
import {
  specialistMobileNavigation,
  specialistNavigation,
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
      brandSubtitle="Portal specjalisty"
      defaultSidebarOpen={
        cookieStore.get("kolor_sensu_sidebar")?.value !== "false"
      }
      logoutAction={logout}
      mobileNavigation={specialistMobileNavigation}
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
        imageUrl: authorization.profile.avatar_url ?? undefined,
      }}
    >
      {children}
    </PortalShell>
  );
}
