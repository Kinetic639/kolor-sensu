"use client";

import { useSave } from "@/lib/use-save";
import { DETAIL_BUTTON, ROW_LINE } from "@repo/ui/detail-page";
import { cn } from "@repo/ui/lib/utils";
import { Upload } from "lucide-react";
import {
  publishHomePageAction,
  publishRoomsPageAction,
  publishSeoPageAction,
} from "./actions";
import { CMS_PAGE_SEO, type CmsPage } from "./page-params";
import type { PageStatus } from "./view-model";

// A page's status and its one "Publikuj stronę", over its sections: the
// sections save drafts, this publishes all of them at once. A page whose
// only settings are its search and sharing ones publishes those.

type Publish = () => ReturnType<typeof publishHomePageAction>;

const pagePublish: Partial<Record<CmsPage, Publish>> = {
  glowna: publishHomePageAction,
  gabinety: publishRoomsPageAction,
};

const publish = (page: CmsPage): Publish =>
  pagePublish[page] ?? (() => publishSeoPageAction(CMS_PAGE_SEO[page]));

const TAG =
  "inline-flex h-5 items-center rounded-[4px] px-1.5 text-[0.75rem] font-medium whitespace-nowrap";

export function PagePublishBar({
  page,
  status,
}: {
  page: CmsPage;
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
      <button
        className={cn(DETAIL_BUTTON, "ml-auto")}
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
