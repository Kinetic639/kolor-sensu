import { updateSpecialistOfferStateAction } from "@/features/specialists/actions";
import {
  loadAdminSpecialistDetail,
  loadProfileSplash,
  loadSpecialistWeek,
} from "@/features/specialists/loaders";
import { SpecialistProfileTab } from "@/features/specialists/profile-preview";
import { SpecialistAccess } from "@/features/specialists/specialist-access";
import { createClient } from "@/lib/supabase/server";
import { searchVisits } from "@repo/supabase";
import {
  publicUrlOf,
  SpecialistOverview,
  SpecialistPageBar,
  SpecialistSchedule,
  SpecialistServices,
  SpecialistSettings,
  SpecialistWeekAside,
} from "@/features/specialists/specialist-page";
import type { SpecialistDetailViewModel } from "@/features/specialists/types";
import { profilePreview } from "@/features/specialists/view-model";
import { DetailBody, DetailTabs } from "@repo/ui/detail-page";
import { FullBleed } from "@repo/ui/full-bleed";
import {
  loadSpecialistPageParams,
  specialistPageTabs,
  type SpecialistPageParams,
} from "@repo/ui/specialists";
import { notFound } from "next/navigation";

// A specialist's page: the bar with who they are, the sections as tabs in
// the address; each tab loads only what it shows (the week for the
// overview and the schedule).

const personOf = (detail: SpecialistDetailViewModel) => ({
  id: detail.id,
  name: detail.displayName,
  title: detail.professionalTitle,
  avatarUrl: detail.avatarUrl,
  color: detail.color,
});

async function Tab({
  detail,
  params,
}: {
  detail: SpecialistDetailViewModel;
  params: SpecialistPageParams;
}) {
  switch (params.zakladka) {
    case "przeglad": {
      const { view } = await loadSpecialistWeek(personOf(detail));
      return (
        <DetailBody
          aside={<SpecialistWeekAside view={view} />}
          asideLabel="Ten tydzień"
        >
          <SpecialistOverview detail={detail} />
        </DetailBody>
      );
    }
    case "grafik": {
      const { view, week, thisWeek } = await loadSpecialistWeek(
        personOf(detail),
        params.tydzien,
      );
      return (
        <SpecialistSchedule
          detail={detail}
          thisWeek={thisWeek}
          view={view}
          week={week}
        />
      );
    }
    case "uslugi":
      return (
        <DetailBody>
          <SpecialistServices
            action={updateSpecialistOfferStateAction.bind(null, detail.id)}
            detail={detail}
          />
        </DetailBody>
      );
    case "profil":
      return (
        <SpecialistProfileTab
          detail={detail}
          preview={profilePreview(
            detail,
            params.wersja === "szkic" ? "draft" : "published",
          )}
          publicUrl={publicUrlOf(detail)}
          splash={await loadProfileSplash(detail.id)}
        />
      );
    case "ustawienia": {
      // The visits still booked with them (to move if they are suspended).
      const { total: upcoming } = await searchVisits(await createClient(), {
        specialistIds: [detail.id],
        statuses: ["confirmed", "awaiting_payment"],
        from: new Date().toISOString(),
        sort: "starts_at",
        descending: false,
        limit: 1,
        offset: 0,
      });
      return (
        <DetailBody>
          <SpecialistAccess
            active={detail.active}
            name={detail.displayName}
            publiclyVisible={detail.publiclyVisible}
            specialistId={detail.id}
            upcoming={upcoming}
          />
          <SpecialistSettings detail={detail} />
        </DetailBody>
      );
    }
  }
}

export default async function SpecialistPage({
  params,
  searchParams,
}: PageProps<"/specjalisci/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const state = loadSpecialistPageParams(query);
  const detail = await loadAdminSpecialistDetail(id);
  if (!detail) notFound();

  return (
    <FullBleed>
      <SpecialistPageBar detail={detail} />
      <DetailTabs
        active={state.zakladka}
        label="Sekcje specjalisty"
        tabs={specialistPageTabs(detail.id, { uslugi: detail.offers.length })}
      />
      <Tab detail={detail} params={state} />
    </FullBleed>
  );
}
