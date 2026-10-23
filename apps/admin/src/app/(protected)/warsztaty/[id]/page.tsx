import { emptyWorkshopInput } from "@repo/contracts/workshops";
import { FullBleed } from "@repo/ui/full-bleed";
import { notFound } from "next/navigation";
import {
  loadServiceOptions,
  loadSpecialistOptions,
} from "@/features/education/loaders";
import {
  loadParticipants,
  loadPlaces,
  loadWorkshop,
  loadWorkshopMessages,
} from "@/features/workshops/loaders";
import { ParticipantsPanel } from "@/features/workshops/participants-panel";
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
  const [participants, messages] = workshop
    ? await Promise.all([
        loadParticipants(workshop.id),
        loadWorkshopMessages(workshop.id),
      ])
    : [[], []];
  const now = Date.now();
  const initial = workshop
    ? recordToInput(workshop, settings.timezone)
    : emptyWorkshopInput(specialists[0]?.id ?? "");

  return (
    <FullBleed>
      <WorkshopWorkspace
        initial={initial}
        participants={
          workshop && workshop.status !== "draft" ? (
            <ParticipantsPanel
              ended={new Date(workshop.endsAt).getTime() <= now}
              messages={messages}
              participants={participants}
              slug={workshop.slug}
              started={new Date(workshop.startsAt).getTime() <= now}
              status={workshop.status}
              workshopId={workshop.id}
            />
          ) : undefined
        }
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
