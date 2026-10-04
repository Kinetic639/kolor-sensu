import { formatDate } from "@repo/scheduling";
import { DETAIL_BUTTON, DetailBody, DetailSection } from "@repo/ui/detail-page";
import { cn } from "@repo/ui/lib/utils";
import {
  EditorialHeading,
  PrimaryButton,
  SecondaryButton,
  SectionEyebrow,
  SpecialistProfileView,
  SpecialistWatercolorCard,
  type SpecialistSplash,
} from "@repo/ui/public-site";
import { ProfileReviewDiff } from "@repo/ui/specialist-admin";
import { SpecialistAvatar, specialistPageHref } from "@repo/ui/specialists";
import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { DraftReviewActions } from "./draft-review-actions";
import { publicFonts } from "./public-fonts";
import type { SpecialistDetailViewModel } from "./types";
import { createProfileDiff, type ProfilePreview } from "./view-model";

// Profil publiczny: the profile as the site shows it, drawn with the site's
// own components, fonts and watercolors (not a list of its fields); the
// draft waiting for review first, and the preview can show it too. Beside
// it, the picture as the portals show it, and the card on the team's page.

const day = (value: string | null) =>
  value ? formatDate(value.slice(0, 10)) : null;

/** The site's paper, its fonts: the preview looks as the page does. */
function SitePaper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        publicFonts,
        "bg-bg text-ink font-body overflow-x-clip",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Opublikowany / Szkic: which one the preview shows. */
function VersionSwitch({
  id,
  version,
}: {
  id: string;
  version: ProfilePreview["version"];
}) {
  const items = [
    { key: "published", label: "Opublikowany", wersja: "opublikowany" },
    { key: "draft", label: "Szkic", wersja: "szkic" },
  ] as const;
  return (
    <nav aria-label="Która wersja">
      <ul className="flex items-center gap-0.5 rounded-[6px] border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 text-[0.75rem]">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              aria-current={version === item.key ? "page" : undefined}
              className={cn(
                "flex h-[22px] items-center rounded-[4px] px-2.5 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none",
                version === item.key
                  ? "bg-[var(--surface)] font-semibold text-[var(--text)] shadow-[0_1px_2px_rgb(16_32_28/0.12)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
              href={
                specialistPageHref(id, {
                  zakladka: "profil",
                  wersja: item.wersja,
                }) as Route
              }
              scroll={false}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SpecialistProfileTab({
  detail,
  preview,
  splash,
  publicUrl,
}: {
  detail: SpecialistDetailViewModel;
  /** None: nothing published, no draft. */
  preview: ProfilePreview | null;
  splash: SpecialistSplash;
  publicUrl: string | null;
}) {
  const draft = detail.draft;
  const waiting = draft?.status === "pending_review";
  if (!preview) {
    return (
      <DetailBody>
        <p className="px-3.5 py-10 text-center text-[0.8125rem] text-[var(--text-muted)]">
          Specjalista nie przesłał jeszcze profilu. Pojawi się tu, gdy go
          przygotuje w swoim portalu.
        </p>
      </DetailBody>
    );
  }
  const published = detail.publicProfile?.publishedAt;
  return (
    <DetailBody
      aside={
        <>
          <DetailSection title="Zdjęcie profilowe">
            <div className="grid gap-3 px-3.5 py-3">
              <div className="flex items-end gap-5">
                {[
                  { size: 64, label: "profil" },
                  { size: 34, label: "listy" },
                  { size: 22, label: "kalendarz" },
                ].map((one) => (
                  <figure
                    className="m-0 grid justify-items-center gap-1.5"
                    key={one.size}
                  >
                    <SpecialistAvatar
                      row={{
                        id: detail.id,
                        name: preview.name,
                        initials: detail.initials,
                        avatarUrl: preview.photoUrl,
                        color: detail.color,
                      }}
                      size={one.size}
                    />
                    <figcaption className="text-[0.6875rem] text-[var(--text-muted)]">
                      {one.label}
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-[0.75rem] text-[var(--text-muted)]">
                {preview.photoUrl
                  ? "Tak wygląda w portalach, w kalendarzu i w rezerwacjach."
                  : "Bez zdjęcia portale pokazują inicjały w kolorze specjalisty."}
              </p>
            </div>
          </DetailSection>
          <DetailSection title="Na liście zespołu">
            <SitePaper className="px-4 py-5">
              <SpecialistWatercolorCard
                as="div"
                className="mx-auto max-w-[12.5rem]"
                headingLevel="h3"
                href={publicUrl ?? "#"}
                name={preview.name}
                portraitSrc={preview.portraitSrc}
                role={preview.role}
                sizes="12.5rem"
                splash={splash}
              />
            </SitePaper>
          </DetailSection>
        </>
      }
      asideLabel="Jak wygląda na stronie i w portalach"
    >
      {waiting ? (
        <DetailSection
          note={
            draft.submittedAt
              ? `przesłano ${day(draft.submittedAt)}`
              : undefined
          }
          title="Szkic czeka na weryfikację"
        >
          <div className="px-3.5 py-3">
            <ProfileReviewDiff fields={createProfileDiff(detail)} />
          </div>
          <DraftReviewActions draftId={draft.id} specialistId={detail.id} />
        </DetailSection>
      ) : null}
      <DetailSection
        actions={
          <>
            {waiting && detail.publicProfile ? (
              <VersionSwitch id={detail.id} version={preview.version} />
            ) : null}
            {publicUrl ? (
              <a
                className={DETAIL_BUTTON}
                href={publicUrl}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink aria-hidden="true" />
                Na stronie
              </a>
            ) : null}
          </>
        }
        note={
          preview.version === "draft"
            ? "szkic, jeszcze nie na stronie"
            : published
              ? `opublikowany ${day(published)}`
              : undefined
        }
        title="Podgląd profilu"
      >
        <SitePaper className="px-5 py-8 sm:px-8 lg:px-10">
          <div className="grid gap-4 pb-8">
            <SectionEyebrow className="text-pink-strong">
              {preview.role}
            </SectionEyebrow>
            <EditorialHeading as="h3" size="h2">
              {preview.name}
            </EditorialHeading>
          </div>
          <SpecialistProfileView
            actions={
              // As on the page; here only to look at.
              <>
                <PrimaryButton arrow asChild>
                  <span>Umów wizytę</span>
                </PrimaryButton>
                <SecondaryButton asChild>
                  <span>Wszyscy specjaliści</span>
                </SecondaryButton>
              </>
            }
            facts={preview.facts}
            longBio={preview.longBio}
            name={preview.name}
            offers={preview.offers}
            portraitSrc={preview.portraitSrc}
            qualifications={preview.qualifications}
            role={preview.role}
            shortBio={preview.shortBio}
            splash={splash}
          />
        </SitePaper>
      </DetailSection>
    </DetailBody>
  );
}
