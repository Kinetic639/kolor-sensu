import { loadProfileEditor } from "@/features/profile/loaders";
import { ProfileEditor } from "@/features/profile/profile-editor";
import { EmptyState, PageTitle } from "@repo/ui/portal-content";

export default async function ProfilePage() {
  const model = await loadProfileEditor();

  if (!model) {
    return (
      <div className="space-y-5">
        <PageTitle>Mój profil</PageTitle>
        <EmptyState
          title="Brak profilu specjalisty"
          description="Twoje konto nie jest jeszcze powiązane z profilem specjalisty. Skontaktuj się z administratorem centrum."
        />
      </div>
    );
  }

  return <ProfileEditor model={model} />;
}
