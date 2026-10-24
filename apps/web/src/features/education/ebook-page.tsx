import type { PublishedEbook } from "@repo/contracts/education";
import { naffyPriceView } from "@repo/app-runtime/naffy-price";
import { EbookDetails, EbookHero, JsonLd } from "@repo/ui/public-site";
import { ClosingCta } from "@/components/closing-cta";
import { siteUrl } from "@/content/site";
import { ConsentVideo } from "@/features/education/consent-video";
import { ebookHref, videoEmbed } from "@/features/education/ebook-view";
import {
  articleImageUrl,
  ebookSampleHref,
  getEbookPrice,
} from "@/lib/education-data";
import { getClosingCta } from "@/lib/public-data";

// An e-book's page, the site's and the admin's preview of its draft (#197):
// what it is, the way to buy it on Naffy (with its price, if shown) and
// the free sample, then the description, who it is for, what is inside
// and the film (loaded on a click).

export async function EbookPageView({ ebook }: { ebook: PublishedEbook }) {
  const [closing, price] = await Promise.all([
    getClosingCta(),
    ebook.showPrice ? getEbookPrice(ebook.naffyUrl) : null,
  ]);
  const shownPrice = price ? naffyPriceView(price) : null;
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
        price={shownPrice}
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
            offers: {
              "@type": "Offer",
              url: ebook.naffyUrl,
              ...(shownPrice && {
                price: shownPrice.amount,
                priceCurrency: "PLN",
              }),
            },
          }),
        }}
      />
    </>
  );
}
