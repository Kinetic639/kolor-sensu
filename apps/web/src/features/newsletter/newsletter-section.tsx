import type { NewsletterSource } from "@repo/contracts/newsletter";
import { NewsletterBand } from "@repo/ui/public-site";
import {
  getCompany,
  getHomeHeaders,
  getNewsletterBand,
} from "@/lib/public-data";
import { NewsletterSignup } from "./newsletter-signup";
import { newsletterSiteKey } from "./site-key";

// The newsletter band with its form, where a page offers it (under an
// article): the CMS's header for the newsletter over the form, only while
// the CMS shows the newsletter (and Turnstile has its keys).

export async function NewsletterSection({
  source,
  className,
}: {
  source: NewsletterSource;
  className?: string;
}) {
  const [band, headers, company] = await Promise.all([
    getNewsletterBand(),
    getHomeHeaders(),
    getCompany(),
  ]);
  const siteKey = band.visible ? newsletterSiteKey() : null;
  if (!siteKey) return null;
  return (
    <NewsletterBand className={className} header={headers.newsletter}>
      <NewsletterSignup
        controller={company?.legalName ?? "Kolor Sensu"}
        source={source}
        turnstileSiteKey={siteKey}
      />
    </NewsletterBand>
  );
}
