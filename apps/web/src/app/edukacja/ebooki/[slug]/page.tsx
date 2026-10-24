import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { EbookPageView } from "@/features/education/ebook-page";
import { ebookHref, ebookSeo } from "@/features/education/ebook-view";
import {
  articleImageUrl,
  getEbook,
  getEbookRedirect,
  getEbooks,
} from "@/lib/education-data";
import { baseOpenGraph } from "@/lib/page-metadata";

// An e-book (docs/product/education-plan.md, PR 5): what it is, the way to
// buy it on Naffy (with its price read from Naffy, if the admin shows it)
// and the free sample, then the
// description, who it is for, what is inside and the film (loaded on a
// click). An old address moves to the current one; a draft is not found.

export async function generateStaticParams() {
  const ebooks = await getEbooks();
  return ebooks.map((ebook) => ({ slug: ebook.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/edukacja/ebooki/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ebook = await getEbook(slug);
  if (!ebook) return { title: "Nie znaleziono e-booka" };
  const seo = ebookSeo(ebook);
  const image = ebook.ogImagePath ?? (ebook.coverPath || null);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: ebookHref(ebook.slug) },
    openGraph: {
      ...baseOpenGraph,
      title: seo.title,
      description: seo.description,
      url: ebookHref(ebook.slug),
      ...(image && {
        images: [
          {
            url: articleImageUrl(image),
            alt: ebook.ogImagePath ? ebook.title : ebook.coverAlt,
          },
        ],
      }),
    },
  };
}

export default async function EbookPage({
  params,
}: PageProps<"/edukacja/ebooki/[slug]">) {
  const { slug } = await params;
  const ebook = await getEbook(slug);
  if (!ebook) {
    const moved = await getEbookRedirect(slug);
    if (moved) permanentRedirect(ebookHref(moved));
    notFound();
  }
  return <EbookPageView ebook={ebook} />;
}
