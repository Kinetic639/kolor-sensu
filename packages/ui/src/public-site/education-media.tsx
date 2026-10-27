import Image from "next/image";
import { BookOpen, Clock3 } from "lucide-react";
import { HanddrawnLink } from "./handdrawn-link";
import { WorkshopCard, type WorkshopCardData } from "./workshop-parts";
import { InkReveal } from "./ink-reveal";
import { CrisisCardFrame } from "./crisis-card-frame";
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
          <article className={styles.article} key={article.id}>
            <InkReveal className={styles.articleFrame}>
              <CrisisCardFrame index={1} />
            </InkReveal>
            <div className={styles.articleContent}>
              <div className={styles.articlePhoto}>
                <Image
                  src={article.image.src}
                  alt={article.image.alt}
                  fill
                  sizes="(min-width: 1024px) 480px, 85vw"
                />
              </div>
              <div className={styles.articleBody}>
                <p className={styles.kicker}>{article.category}</p>
                <h3 className={styles.materialTitle}>{article.title}</h3>
                <p className={styles.excerpt}>{article.lead}</p>
                <div className={styles.articleFoot}>
                  <span className={styles.meta}>
                    <Clock3 size={15} aria-hidden="true" />
                    {article.reading}
                  </span>
                  <HanddrawnLink href={article.href}>Przeczytaj</HanddrawnLink>
                </div>
              </div>
            </div>
          </article>
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
      <div className={styles.bookShelf}>
        {books.map((book, index) => (
          <article className={styles.book} key={book.id}>
            <div className={index === 0 ? styles.bookTall : styles.bookSquare}>
              <Image
                src={book.image.src}
                alt={book.image.alt}
                fill
                sizes="(min-width: 1024px) 230px, 40vw"
              />
            </div>
            <p className={styles.bookFormat}>{book.format}</p>
            <h3 className={styles.bookTitle}>{book.title}</h3>
            <HanddrawnLink href={book.href}>Zajrzyj do środka</HanddrawnLink>
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
      <WorkshopCard workshop={workshop} animatePhoto={false} variant="story" />
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
