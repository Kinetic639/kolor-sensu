import { loadAdminServices } from "@/features/services/loaders";
import { NewServiceButton } from "@/features/services/new-service-button";
import { toServiceListItems } from "@/features/services/view-model";
import { ResourceList } from "@repo/ui/resource-list";

export default async function OfferPage() {
  const { items } = await loadAdminServices();

  return (
    <ResourceList
      actions={<NewServiceButton />}
      emptyText="Katalog usług jest pusty. Dodaj pierwszą usługę centrum."
      filters={[
        { id: "active", label: "Aktywne" },
        { id: "inactive", label: "Nieaktywne" },
        { id: "on-site", label: "Na stronie" },
        { id: "booking", label: "Rezerwacja online" },
      ]}
      items={toServiceListItems(items)}
      label="Usługi"
      noMatchText="Żadna usługa nie pasuje do wyszukiwania i filtra."
      searchLabel="Szukaj usługi"
      searchPlaceholder="Szukaj usługi…"
    />
  );
}
