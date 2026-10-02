import { loadClients } from "@/features/clients/loaders";
import { ClientTable, loadClientTableParams } from "@repo/ui/client-table";
import { PageTitle } from "@repo/ui/portal-content";

// Klienci (R15): everyone who booked, searched and sorted by the database;
// the address holds the state. A name opens the client's card.

const PATH = "/klienci";

export default async function ClientsPage({
  searchParams,
}: PageProps<"/klienci">) {
  const params = loadClientTableParams(await searchParams);
  const { rows, total } = await loadClients(params);
  return (
    <div className="space-y-4">
      <PageTitle>Klienci</PageTitle>
      <ClientTable params={params} path={PATH} rows={rows} total={total} />
    </div>
  );
}
