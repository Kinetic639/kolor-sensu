"use client";

import { useSave } from "@/lib/use-save";
import { DETAIL_BUTTON, ROW_LINE } from "@repo/ui/detail-page";
import { cn } from "@repo/ui/lib/utils";
import { Eye, Upload } from "lucide-react";
import {
  publishHomePageAction,
  publishRoomsPageAction,
  publishSeoPageAction,
  publishSiteAppearanceAction,
} from "./actions";
import {
  CMS_PAGE_SEO,
  isCmsPage,
  type CmsPage,
  type CmsTab,
} from "./page-params";
import { cmsPreviewHref } from "./preview";
import type { PageStatus } from "./view-model";

// A page's status and its one "Publikuj stronę", over its sections: the
// sections save drafts, this publishes all of them at once. A page whose
// only settings are its search and sharing ones publishes those. "Podgląd"
// opens the page on the site in a new tab with the saved drafts, as it will
// look once published, and refreshes itself as sections are saved
// (preview.ts). The shared settings' tab has the same bar: it publishes
// them for every page.

type Publish = () => ReturnType<typeof publishHomePageAction>;

const pagePublish: Partial<Record<CmsPage, Publish>> = {
  glowna: publishHomePageAction,
  gabinety: publishRoomsPageAction,
};

const publish = (page: CmsTab): Publish =>
  isCmsPage(page)
    ? (pagePublish[page] ?? (() => publishSeoPageAction(CMS_PAGE_SEO[page])))
    : publishSiteAppearanceAction;

const TAG =
  "inline-flex h-5 items-center rounded-[4px] px-1.5 text-[0.75rem] font-medium whitespace-nowrap";

export function PagePublishBar({
  page,
  status,
}: {
  page: CmsTab;
  status: PageStatus;
}) {
  const { isPending, run } = useSave();
  const canPublish = status.hasUnpublishedChanges;
  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-[var(--surface)] px-3.5 py-1.5",
        ROW_LINE,
      )}
    >
      <span
        className={cn(
          TAG,
          status.isPublished
            ? "bg-[var(--success-soft)] text-[var(--success)]"
            : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
        )}
      >
        {status.isPublished ? "Opublikowana" : "Nieopublikowana"}
      </span>
      {status.hasUnpublishedChanges ? (
        <span
          className={cn(
            TAG,
            "bg-[var(--warning-soft)] text-[var(--warning-foreground)]",
          )}
        >
          Niepublikowane zmiany
        </span>
      ) : null}
      <span className="text-[0.75rem] text-[var(--text-muted)]">
        {status.publishedAtLabel
          ? `Opublikowana ${status.publishedAtLabel}`
          : "Jeszcze nie publikowana: strona pokazuje swoje domyślne treści"}
        {status.updatedAtLabel ? ` · zmiany ${status.updatedAtLabel}` : ""}
      </span>
      <a
        className={cn(DETAIL_BUTTON, "ml-auto")}
        href={cmsPreviewHref(page)}
        rel="noopener"
        target="_blank"
        title="Otwiera stronę z zapisanymi, jeszcze nieopublikowanymi zmianami, w nowej karcie"
      >
        <Eye aria-hidden="true" />
        Podgląd
      </a>
      <button
        className={DETAIL_BUTTON}
        disabled={!canPublish || isPending}
        onClick={() => run(publish(page), "Strona opublikowana")}
        title={
          canPublish
            ? "Publikuje wszystkie zapisane sekcje tej strony"
            : "Nie ma nic nowego do opublikowania"
        }
        type="button"
      >
        <Upload aria-hidden="true" />
        {isPending ? "Publikowanie…" : "Publikuj stronę"}
      </button>
    </div>
  );
}
