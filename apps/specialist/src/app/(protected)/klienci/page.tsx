import { loadMyClients } from "@/features/clients/loaders";
import { MyClients } from "@/features/clients/my-clients";
import { FullBleed } from "@repo/ui/full-bleed";
import { PageTitle } from "@repo/ui/portal-content";

// Moi klienci: the people with a visit with this specialist, the next visit
// first; each opens their card with the visits with them. Their contact
// as they gave it; the centre's own notes about them are not shown.

export default async function MyClientsPage() {
  const { rows } = await loadMyClients();
  return (
    <FullBleed>
      <PageTitle>Moi klienci</PageTitle>
      <MyClients rows={rows} />
    </FullBleed>
  );
}
