import { loadMyServices } from "@/features/services/loaders";
import { MyServices } from "@/features/services/my-services";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";

export default async function ServicesPage() {
  const model = await loadMyServices();

  if (!model) {
    return (
      <div className="space-y-5">
        <PageTitle>Moje usługi i stawki</PageTitle>
        <EmptyState
          title="Brak profilu specjalisty"
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
        />
      </div>
    );
  }

  return <MyServices model={model} />;
}
