import {
  formatDate,
  formatDateRangeShort,
  type PersonalWeekView,
} from "@repo/scheduling";
import {
  DaySchedule,
  Figures,
  ScheduleAgenda,
  ScheduleCanvas,
  ScheduleFrame,
  ScheduleToolbar,
  UpcomingVisitList,
  weekFigures,
} from "@repo/ui/calendar-view";
import {
  DETAIL_BUTTON,
  DetailBar,
  DetailProp,
  DetailProps,
  DetailSection,
} from "@repo/ui/detail-page";
import {
  profileTag,
  SpecialistAvatar,
  SpecialistOfferTable,
  specialistScheduleNav,
  SpecialistTags,
  type OfferStateAction,
} from "@repo/ui/specialists";
import { Tag } from "@repo/ui/visit-table";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { PublicAddressButton } from "./public-address";
import { SpecialistColorForm } from "./specialist-color";
import type { SpecialistDetailViewModel } from "./types";
import { detailState } from "./view-model";

// A specialist's page (Specjaliści → a person), in the tables' language:
// one bar with who they are and their state, the sections as tabs in the
// address, the content in sections of rows. Each tab renders on the
// server; only the forms and switches are interactive.

const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

/** Where a visit opens: the bookings, with it in the side panel. */
export const visitHref = (visitId: string) =>
  `/rezerwacje?zakres=wszystkie&wizyta=${visitId}`;

/** Their profile on the site, when there is one to see. */
export function publicUrlOf(detail: SpecialistDetailViewModel) {
  return detail.publicProfile?.publicationStatus === "published"
    ? `${webUrl}/specjalisci/${detail.publicSlug}`
    : null;
}

const day = (value: string | null) =>
  value ? formatDate(value.slice(0, 10)) : "—";

function Muted({ children }: { children: ReactNode }) {
  return (
    <span className="text-[0.75rem] text-[var(--text-muted)]">{children}</span>
  );
}

export function SpecialistPageBar({
  detail,
}: {
  detail: SpecialistDetailViewModel;
}) {
  return (
    <DetailBar
      // Their state on the right, as on a room's page.
      actions={<SpecialistTags state={detailState(detail)} withActive />}
      back={{ href: "/specjalisci", label: "Specjaliści" }}
      leading={
        <SpecialistAvatar
          row={{
            id: detail.id,
            name: detail.displayName,
            initials: detail.initials,
            avatarUrl: detail.avatarUrl,
            color: detail.color,
          }}
        />
      }
      subtitle={detail.professionalTitle}
      title={detail.displayName}
    />
  );
}

/** Przegląd: the account and the work, the profile on the site. */
export function SpecialistOverview({
  detail,
}: {
  detail: SpecialistDetailViewModel;
}) {
  const profile = detail.publicProfile;
  const waiting = detail.draft?.status === "pending_review";
  const publicUrl = publicUrlOf(detail);
  return (
    <>
      <DetailSection title="Konto i współpraca">
        <DetailProps>
          <DetailProp label="Współpraca od">{day(detail.joinedAt)}</DetailProp>
          <DetailProp label="Konto">
            <Tag tone={detail.accountActive ? "success" : "neutral"}>
              {detail.accountActive ? "Aktywne" : "Nieaktywne"}
            </Tag>
          </DetailProp>
          <DetailProp label="Współpraca">
            <Tag tone={detail.active ? "success" : "neutral"}>
              {detail.active ? "Aktywna" : "Nieaktywna"}
            </Tag>
          </DetailProp>
        </DetailProps>
      </DetailSection>
      <DetailSection
        actions={<PreviewLink href={publicUrl} />}
        title="Profil na stronie"
      >
        <DetailProps>
          <DetailProp label="Stan">
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Tag tone={profileTag(detailState(detail).profile).tone}>
                {profileTag(detailState(detail).profile).label}
              </Tag>
              <Muted>
                {profile?.publishedAt
                  ? `opublikowano ${day(profile.publishedAt)}`
                  : "jeszcze nie opublikowany"}
                {waiting ? " · szkic czeka na weryfikację" : ""}
              </Muted>
            </span>
          </DetailProp>
          <DetailProp label="Adres">
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-mono text-[0.75rem] break-all">
                /specjalisci/{detail.publicSlug}
              </span>
              <PublicAddressButton
                displayName={detail.displayName}
                slug={detail.publicSlug}
                specialistId={detail.id}
              />
            </span>
          </DetailProp>
          <DetailProp label="Usługi">
            <span className="tabular-nums">{detail.offerSummary}</span>
          </DetailProp>
        </DetailProps>
      </DetailSection>
    </>
  );
}

function PreviewLink({ href }: { href: string | null }) {
  if (!href) return null;
  return (
    <a className={DETAIL_BUTTON} href={href} rel="noreferrer" target="_blank">
      <ExternalLink aria-hidden="true" />
      Podgląd
    </a>
  );
}

/** Beside the overview: this week in numbers and the next visits. */
export function SpecialistWeekAside({ view }: { view: PersonalWeekView }) {
  return (
    <>
      <DetailSection
        note={formatDateRangeShort(view.from, view.to)}
        title="Ten tydzień"
      >
        <Figures
          className="border-b-0"
          items={weekFigures(view.summary.occupancy)}
          stacked
        />
      </DetailSection>
      <DetailSection title="Najbliższe wizyty">
        <UpcomingVisitList
          empty="Nie ma zaplanowanych wizyt."
          upcoming={view.summary.upcoming}
          visitHref={visitHref}
        />
      </DetailSection>
    </>
  );
}

/** Grafik: their week as the calendar shows it, week by week. */
export function SpecialistSchedule({
  detail,
  view,
  week,
  thisWeek,
}: {
  detail: SpecialistDetailViewModel;
  view: PersonalWeekView;
  week: string;
  thisWeek: string;
}) {
  const label = `Tydzień: ${detail.displayName}`;
  const empty = "W tym tygodniu nie ma dyżurów ani wizyt.";
  return (
    <ScheduleCanvas className="flex min-h-0 flex-1 flex-col">
      <ScheduleToolbar
        nav={specialistScheduleNav(detail.id, { week, thisWeek })}
        search={false}
        switches={["wyszarz", "wizyty", "dostepnosc"]}
        views={[]}
      />
      <ScheduleFrame
        desktop={
          <DaySchedule
            ariaLabel={label}
            empty={empty}
            mode="personal"
            view={view}
            visitHref={visitHref}
          />
        }
        mobile={
          <ScheduleAgenda
            ariaLabel={label}
            columns={view.columns}
            empty={empty}
            visitHref={visitHref}
          />
        }
      />
    </ScheduleCanvas>
  );
}

/** Usługi i cennik: the offers, switched on the spot. */
export function SpecialistServices({
  detail,
  action,
}: {
  detail: SpecialistDetailViewModel;
  action: OfferStateAction;
}) {
  return (
    <DetailSection
      note="Cenę i czas ustawia specjalista w swoim portalu."
      title="Usługi i cennik"
    >
      <SpecialistOfferTable action={action} offers={detail.offers} />
    </DetailSection>
  );
}

/** Ustawienia: their colour in schedules and lists. */
export function SpecialistSettings({
  detail,
}: {
  detail: SpecialistDetailViewModel;
}) {
  return (
    <DetailSection
      note="wyróżnia specjalistę w grafikach i na listach"
      title="Kolor"
    >
      <div className="max-w-2xl">
        <SpecialistColorForm
          automaticColor={detail.automaticAccent}
          color={detail.color}
          specialistId={detail.id}
        />
      </div>
    </DetailSection>
  );
}
