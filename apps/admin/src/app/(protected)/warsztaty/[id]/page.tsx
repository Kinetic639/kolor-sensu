import { emptyWorkshopInput } from "@repo/contracts/workshops";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";
import {
  loadServiceOptions,
  loadSpecialistOptions,
} from "@/features/education/loaders";
import { loadPlaces, loadWorkshop } from "@/features/workshops/loaders";
import { recordToInput } from "@/features/workshops/view-model";
import { WorkshopWorkspace } from "@/features/workshops/workshop-workspace";
import { centreSettings } from "@/lib/reference-data";

// A workshop's page in the portal (/warsztaty/nowy: an empty one): the
// whole workshop in one form, saved, published and cancelled from the bar.

export default async function WorkshopPage({
  params,
}: PageProps<"/warsztaty/[id]">) {
  const { id } = await params;
  const isNew = id === "nowy";
  const [workshop, specialists, places, services, settings] = await Promise.all(
    [
      isNew ? null : loadWorkshop(id).catch(() => null),
      loadSpecialistOptions(),
      loadPlaces(),
      loadServiceOptions(),
      centreSettings(),
    ],
  );
  if (!isNew && !workshop) notFound();
  const initial = workshop
    ? recordToInput(workshop, settings.timezone)
    : emptyWorkshopInput(specialists[0]?.id ?? "");

  return (
    <FullBleed>
      <WorkshopWorkspace
        initial={initial}
        key={workshop?.updatedAt ?? "nowy"}
        places={places}
        services={services}
        specialists={specialists}
        state={{
          id: workshop?.id ?? null,
          status: workshop?.status ?? "draft",
          confirmed: Boolean(
            workshop?.confirmedAt || workshop?.minParticipants === null,
          ),
          activeRegistrations: workshop?.activeRegistrations ?? 0,
          anyRegistrations: workshop?.anyRegistrations ?? false,
          cancelReason: workshop?.cancelReason ?? null,
          savedSlug: workshop?.slug ?? null,
        }}
        webUrl={(
          process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"
        ).replace(/\/$/, "")}
      />
    </FullBleed>
  );
}
