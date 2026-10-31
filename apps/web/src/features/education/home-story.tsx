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
import {
  articleHref,
  readingLabel,
  articleAuthor,
  articleDate,
} from "./article-view";
import { getSpecialists } from "@/lib/public-data";
import { ebookHref } from "./ebook-view";
import { workshopCard } from "../workshops/workshop-view";

/** Resolve only published material on the server; the browser receives rendered cards. */
export async function educationStorySteps(
  story: HomeStory,
  images: readonly PaintedStoryStep["image"][],
  watercolor: WatercolorLook,
): Promise<PaintedStoryStep[]> {
  const kinds = story.steps.map(storyMediaOf);
  const [articles, ebooks, workshops, categories, specialists] =
    await Promise.all([
      kinds.some((m) => m.type === "articles") ? getArticles() : [],
      kinds.some((m) => m.type === "ebooks") ? getEbooks() : [],
      kinds.some((m) => m.type === "workshops") ? getWorkshops() : [],
      kinds.some((m) => m.type === "articles") ? getArticleCategories() : [],
      kinds.some((m) => m.type === "articles") ? getSpecialists() : [],
    ]);
  const people = specialists.map((one) => ({
    specialistId: one.specialistId,
    publicSlug: one.publicSlug,
    displayName: one.displayName,
    professionalTitle: one.professionalTitle,
    portraitUrl: one.portraitUrl ?? one.photoUrl,
  }));
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
                author: articleAuthor(a, people).name,
                authorAvatarUrl: articleAuthor(a, people).photoUrl,
                authorTitle: articleAuthor(a, people).title,
                date: articleDate(a.publishedAt),
                dateTime: a.publishedAt,
                href: articleHref(a.slug),
              }))}
            />
          ),
        };
    }
    if (media.type === "ebooks") {
      const selected = selectStoryItems(books, media, 2);
      const primary =
        media.source === "auto"
          ? books.find((book) => book.id === media.mobilePrimaryId)
          : undefined;
      const chosen =
        primary && !selected.some((book) => book.id === primary.id)
          ? [primary, ...selected].slice(0, 2)
          : selected;
      if (chosen.length)
        return {
          ...step,
          content: (
            <EducationBooks
              mobilePrimaryId={media.mobilePrimaryId}
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
        return {
          ...step,
          content: (
            <EducationWorkshopCard
              workshop={workshopCard(one, {
                now: new Date(),
                timeZone: "Europe/Warsaw",
                imageUrl: workshopImageUrl,
              })}
            />
          ),
        };
      }
    }
    return step;
  });
}
