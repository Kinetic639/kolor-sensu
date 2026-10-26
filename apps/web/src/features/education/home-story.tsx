import { storyMediaOf } from "@repo/contracts";
import {
  EducationArticles,
  EducationBooks,
  EducationWorkshopCard,
  type WatercolorLook,
  type PaintedStoryStep,
} from "@repo/ui/public-site";
import {
  getArticles,
  getEbooks,
  getArticleCategories,
  articleImageUrl,
} from "@/lib/education-data";
import { getWorkshops, workshopImageUrl } from "@/lib/workshop-data";
import { toStorySteps, type HomeStory } from "@/lib/home-content";
import { selectStoryItems } from "@/lib/education-story";
import { articleHref, readingLabel } from "./article-view";
import { ebookHref } from "./ebook-view";

/** Resolve only published material on the server; the browser receives rendered cards. */
export async function educationStorySteps(
  story: HomeStory,
  images: readonly PaintedStoryStep["image"][],
  watercolor: WatercolorLook,
): Promise<PaintedStoryStep[]> {
  const kinds = story.steps.map(storyMediaOf);
  const [articles, ebooks, workshops, categories] = await Promise.all([
    kinds.some((m) => m.type === "articles") ? getArticles() : [],
    kinds.some((m) => m.type === "ebooks") ? getEbooks() : [],
    kinds.some((m) => m.type === "workshops") ? getWorkshops() : [],
    kinds.some((m) => m.type === "articles") ? getArticleCategories() : [],
  ]);
  const newest = [...articles].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const books = [...ebooks].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const upcoming = workshops
    .filter((w) => w.status === "published" && new Date(w.endsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return toStorySteps(story, images).map((step, index) => {
    const media = kinds[index]!;
    if (
      !story.steps[index]!.media &&
      media.type === "articles" &&
      step.cta?.label === "Czytaj artykuły"
    ) {
      step = { ...step, cta: { ...step.cta, label: "Więcej artykułów" } };
    }
    if (media.type === "articles") {
      const chosen = selectStoryItems(newest, media, 3);
      if (chosen.length)
        return {
          ...step,
          content: (
            <EducationArticles
              articles={chosen.map((a) => ({
                id: a.id,
                title: a.title,
                lead: a.lead,
                image: { src: articleImageUrl(a.coverPath), alt: a.coverAlt },
                category:
                  categories.find((c) => c.id === a.categoryId)?.name ??
                  "Artykuły",
                reading: readingLabel(a.body),
                href: articleHref(a.slug),
              }))}
            />
          ),
        };
    }
    if (media.type === "ebooks") {
      const chosen = selectStoryItems(books, media, 2);
      if (chosen.length)
        return {
          ...step,
          content: (
            <EducationBooks
              books={chosen.map((b) => ({
                id: b.id,
                title: b.title,
                format: b.format,
                image: { src: articleImageUrl(b.coverPath), alt: b.coverAlt },
                href: ebookHref(b.slug),
              }))}
            />
          ),
        };
    }
    if (media.type === "workshops") {
      const one = selectStoryItems(upcoming, media, 1)[0];
      if (one) {
        const date = new Date(one.startsAt);
        const format = (options: Intl.DateTimeFormatOptions) =>
          new Intl.DateTimeFormat("pl-PL", {
            ...options,
            timeZone: "Europe/Warsaw",
          }).format(date);
        return {
          ...step,
          content: (
            <EducationWorkshopCard
              watercolor={{ watercolorSrc: watercolor.watercolorSrc }}
              workshop={{
                title: one.title,
                description: one.shortDescription,
                image: {
                  src: one.coverPath
                    ? workshopImageUrl(one.coverPath)
                    : (step.image.src as string),
                  alt: one.coverPath ? (one.coverAlt ?? "") : "",
                },
                day: format({ day: "numeric" }),
                month: format({ day: "numeric", month: "long" }).replace(
                  /^\d+\s*/,
                  "",
                ),
                year: format({ year: "numeric" }),
                time: format({ hour: "2-digit", minute: "2-digit" }),
                place:
                  one.modality === "online"
                    ? "Online"
                    : (one.locationCity ?? one.locationName),
                href: `/warsztaty/${one.slug}`,
              }}
            />
          ),
        };
      }
    }
    return step;
  });
}
