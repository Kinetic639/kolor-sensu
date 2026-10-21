import { EbookDetails, EbookHero, JsonLd } from "@repo/ui/public-site";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ClosingCta } from "@/components/closing-cta";
import { siteUrl } from "@/content/site";
import { ConsentVideo } from "@/features/education/consent-video";
import {
  ebookHref,
  ebookSeo,
  videoEmbed,
} from "@/features/education/ebook-view";
import {
  articleImageUrl,
  ebookSampleHref,
  getEbook,
  getEbookRedirect,
  getEbooks,
} from "@/lib/education-data";
import { baseOpenGraph } from "@/lib/page-metadata";
import { getClosingCta } from "@/lib/public-data";

// An e-book (docs/product/education-plan.md, PR 5): what it is, the way to
// buy it on Naffy (the price is Naffy's) and the free sample, then the
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
  const closing = await getClosingCta();
  const coverUrl = ebook.coverPath ? articleImageUrl(ebook.coverPath) : null;
  const video = videoEmbed(ebook.videoUrl);

  return (
    <>
      <EbookHero
        coverAlt={ebook.coverAlt}
        coverUrl={coverUrl}
        description={ebook.shortDescription}
        format={ebook.format}
        naffyUrl={ebook.naffyUrl || null}
        sampleHref={
          ebook.samplePath
            ? ebookSampleHref(ebook.samplePath, ebook.slug)
            : null
        }
        title={ebook.title}
      />
      <EbookDetails
        aside={
          video ? (
            <ConsentVideo
              posterUrl={coverUrl}
              title={ebook.title}
              video={video}
            />
          ) : null
        }
        audience={ebook.audience}
        contents={ebook.contents}
        description={ebook.description}
      />
      <ClosingCta words={closing} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Book",
          name: ebook.title,
          description: ebook.shortDescription,
          url: `${siteUrl}${ebookHref(ebook.slug)}`,
          bookFormat: "https://schema.org/EBook",
          inLanguage: "pl-PL",
          ...(coverUrl && { image: coverUrl }),
          publisher: {
            "@type": "Organization",
            name: "Kolor Sensu",
            url: siteUrl,
          },
          ...(ebook.naffyUrl && {
            offers: { "@type": "Offer", url: ebook.naffyUrl },
          }),
        }}
      />
    </>
  );
}
