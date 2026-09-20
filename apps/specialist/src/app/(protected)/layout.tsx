import { requirePortalRole } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePortalRole();
  return children;
}
