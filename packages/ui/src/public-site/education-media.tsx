import Image from "next/image";
import { BookOpen } from "lucide-react";
import { HanddrawnLink } from "./handdrawn-link";
import { WorkshopCard, type WorkshopCardData } from "./workshop-parts";
import { ArticleCard } from "./article-cards";
import { HoverPaint } from "./hover-paint";
import { InkReveal } from "./ink-reveal";
import { CrisisCardFrame } from "./crisis-card-frame";
import { PageLink } from "./page-link";
import { EducationArticleGallery } from "./education-gallery";
import { educationStyles as styles } from "./education-styles";

interface EducationImage {
  src: string;
  alt: string;
}
export interface EducationArticle {
  id: string;
  title: string;
  lead: string;
  image: EducationImage;
  category: string;
  reading: string;
  author?: string;
  authorAvatarUrl?: string | null;
  authorTitle?: string | null;
  date?: string;
  dateTime?: string;
  href: string;
}
export interface EducationBook {
  id: string;
  title: string;
  format: string;
  image: EducationImage;
  href: string;
}
export type EducationWorkshop = WorkshopCardData;

export function EducationArticles({
  articles: latest,
}: {
  articles: readonly EducationArticle[];
}) {
  return latest.length ? (
    <EducationArticleGallery
      key="articles"
      slides={[
        ...latest.map((article) => (
          <ArticleCard
            key={article.id}
            article={{
              id: article.id,
              title: article.title,
              lead: article.lead,
              href: article.href,
              coverUrl: article.image.src,
              coverAlt: article.image.alt,
              category: article.category
                ? { name: article.category, href: "" }
                : null,
              reading: article.reading,
              author: article.author,
              authorAvatarUrl: article.authorAvatarUrl,
              authorTitle: article.authorTitle,
              date: article.date,
              dateTime: article.dateTime,
            }}
          />
        )),
      ]}
    />
  ) : (
    <EmptyMaterial key="articles" text="Pierwsze artykuły już wkrótce." />
  );
}
export function EducationBooks({ books }: { books: readonly EducationBook[] }) {
  return books.length ? (
    <div className={styles.books} key="books">
      <div className="ks-education-books-paint" aria-hidden="true">
        <HoverPaint />
      </div>
      <div className={styles.bookShelf}>
        {books.map((book, index) => (
          <article className={styles.book} key={book.id}>
            <PageLink
              href={book.href}
              tabIndex={-1}
              className={index === 0 ? styles.bookTall : styles.bookSquare}
            >
              <Image
                src={book.image.src}
                alt={book.image.alt}
                fill
                sizes="(min-width: 1024px) 230px, 40vw"
              />
            </PageLink>
            <div className="ks-education-book-card">
              <InkReveal className="ks-education-book-frame">
                <CrisisCardFrame index={index} />
              </InkReveal>
              <div className="ks-education-book-copy">
                <p className={styles.bookFormat}>{book.format}</p>
                <h3 className={styles.bookTitle}>{book.title}</h3>
                <HanddrawnLink href={book.href}>
                  Zajrzyj do środka
                </HanddrawnLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  ) : (
    <EmptyMaterial key="ebooks" text="Pierwsze e-booki już wkrótce." />
  );
}
export function EducationWorkshopCard({
  workshop,
}: {
  workshop: EducationWorkshop | null;
}) {
  return workshop ? (
    <div className={styles.workshop}>
      <WorkshopCard workshop={workshop} animatePhoto={false} />
    </div>
  ) : (
    <EmptyMaterial text="Przygotowujemy kolejne spotkania. Zapytaj nas o nowe terminy." />
  );
}
function EmptyMaterial({ text }: { text: string }) {
  return (
    <div className={styles.empty}>
      <BookOpen aria-hidden="true" size={32} strokeWidth={1.3} />
      <p>{text}</p>
    </div>
  );
}
