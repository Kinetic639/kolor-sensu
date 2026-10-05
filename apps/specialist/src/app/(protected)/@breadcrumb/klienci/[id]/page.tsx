import { loadMyClient } from "@/features/clients/loaders";
import { SpecialistBreadcrumbs } from "@/lib/breadcrumbs";

// A client's card: Moi klienci › their name.
export default async function ClientBreadcrumb({
  params,
}: PageProps<"/klienci/[id]">) {
  const { id } = await params;
  const found = await loadMyClient(id).catch(() => null);
  return (
    <SpecialistBreadcrumbs
      detail={found?.client.name ?? null}
      pathname={`/klienci/${id}`}
    />
  );
}
