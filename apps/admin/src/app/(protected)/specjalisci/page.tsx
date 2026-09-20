import { SpecialistsList } from "@/features/specialists/specialists-list";
import { loadAdminSpecialists } from "@/features/specialists/loaders";

export default async function SpecialistsPage() {
  return <SpecialistsList initialData={await loadAdminSpecialists()} />;
}
