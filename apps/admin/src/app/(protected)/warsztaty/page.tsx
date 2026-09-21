import { WorkshopsList } from "@/features/warsztaty/workshops-list";
import {
  loadAdminWorkshops,
  loadWorkshopFormOptions,
} from "@/features/warsztaty/loaders";

export default async function WarsztatyPage() {
  const [initialData, formOptions] = await Promise.all([
    loadAdminWorkshops(),
    loadWorkshopFormOptions(),
  ]);
  return <WorkshopsList formOptions={formOptions} initialData={initialData} />;
}
