import { ArrowRight } from "lucide-react";
import { PageLink as Link } from "./page-link";

// An announcement of the centre (the admin's CMS: "19–23.12 centrum
// nieczynne"), as a narrow bar above the header, on the days it is set
// for. Server-safe; its link (if any) after the words.

export interface SiteAnnouncement {
  id: string;
  message: string;
  link: { label: string; href: string } | null;
}

export function AnnouncementBar({
  announcement,
}: {
  announcement: SiteAnnouncement;
}) {
  return (
    <section
      aria-label="Ogłoszenie"
      className="bg-primary-strong text-on-primary px-gutter"
    >
      <p className="text-small max-w-page mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 py-2 text-center">
        <span>{announcement.message}</span>
        {announcement.link ? (
          <Link
            className="group/announce inline-flex items-center gap-1 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            href={announcement.link.href}
          >
            {announcement.link.label}
            <ArrowRight
              aria-hidden="true"
              className="ease-soft size-3.5 transition-transform group-hover/announce:translate-x-0.5"
            />
          </Link>
        ) : null}
      </p>
    </section>
  );
}
