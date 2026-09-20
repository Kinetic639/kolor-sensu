import { ServicesList } from "@/features/services/services-list";
import { loadAdminServices } from "@/features/services/loaders";

export default async function OfferPage() {
  return <ServicesList initialData={await loadAdminServices()} />;
}
