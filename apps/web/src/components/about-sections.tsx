import type { AboutAudience } from "@repo/contracts";
import type { SectionHeaderContent } from "@repo/contracts/section-header";
import { ArrowLink, SectionHeader, SoftCard } from "@repo/ui/public-site";
import Image from "next/image";
import { useId } from "react";

// O nas → the parts the admin switches on in the CMS once they have their
// words: "Nasza historia" and "Z kim pracujemy". Plainly laid out for now
// (their look is polished with the rest of the page later); each is a
// section named by its header's title.

/** "Nasza historia": a few paragraphs, and a photo beside them when given. */
export function AboutStory({
  header,
  text,
  image,
}: {
  header: SectionHeaderContent;
  text: string;
  image: { src: string; alt: string } | null;
}) {
  const headingId = useId();
  const paragraphs = text.split(/\n\s*\n/).filter((one) => one.trim());
  return (
    <section
      aria-labelledby={headingId}
      className="max-w-page px-gutter pb-section-sm mx-auto grid items-start gap-10 lg:grid-cols-2 lg:gap-16"
    >
      <div className="grid content-start gap-5">
        <SectionHeader content={header} id={headingId} size="h2" />
        {paragraphs.map((paragraph, index) => (
          <p
            className="text-body text-ink max-w-copy whitespace-pre-line"
            key={index}
          >
            {paragraph.trim()}
          </p>
        ))}
      </div>
      {image ? (
        <div className="rounded-card relative aspect-[4/3] overflow-hidden">
          <Image
            alt={image.alt}
            className="object-cover"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={image.src}
          />
        </div>
      ) : null}
    </section>
  );
}

/** "Z kim pracujemy": a card per group, each leading to the offer. */
export function AboutAudiences({
  header,
  audiences,
  note,
}: {
  header: SectionHeaderContent;
  audiences: readonly AboutAudience[];
  note: string;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="max-w-page px-gutter pb-section-sm mx-auto grid gap-8"
    >
      <SectionHeader content={header} id={headingId} size="h2" />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {audiences.map((audience) => (
          <li key={audience.title}>
            <SoftCard className="grid h-full content-start gap-3 p-6">
              <h3 className="font-display text-h3 text-ink">
                {audience.title}
              </h3>
              {audience.text ? (
                <p className="text-body text-text-muted">{audience.text}</p>
              ) : null}
              <ArrowLink className="justify-self-start" href={audience.href}>
                {`Zobacz ofertę: ${audience.title}`}
              </ArrowLink>
            </SoftCard>
          </li>
        ))}
      </ul>
      {note ? <p className="text-body text-text-muted">{note}</p> : null}
    </section>
  );
}
