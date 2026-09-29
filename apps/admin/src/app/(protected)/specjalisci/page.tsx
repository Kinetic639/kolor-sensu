import { loadAdminSpecialists } from "@/features/specialists/loaders";
import { toSpecialistListItems } from "@/features/specialists/view-model";
import { ResourceList } from "@repo/ui/resource-list";

export default async function SpecialistsPage() {
  const { items } = await loadAdminSpecialists();

  return (
    <ResourceList
      allLabel="Wszyscy"
      emptyText="Nie ma jeszcze specjalistów."
      filters={[
        { id: "active", label: "Aktywni" },
        { id: "inactive", label: "Nieaktywni" },
        { id: "pending", label: "Do weryfikacji" },
      ]}
      items={toSpecialistListItems(items)}
      label="Specjaliści"
      noMatchText="Nikt nie pasuje do wyszukiwania i filtra."
      searchLabel="Szukaj specjalisty"
      searchPlaceholder="Szukaj specjalisty…"
    />
  );
}
