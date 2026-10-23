// An e-book's price from its product page on Naffy (#150), read on the
// server: Naffy has no public API, but its product page carries the
// product's data as JSON (the price in grosze, a promotion's price, its end
// and the lowest price of the 30 days before it). Anything unexpected (a
// page that is not a Naffy product, another currency, a subscription, a
// free product, a changed page) gives no price, and the site falls back to
// "Zobacz cenę i kup na Naffy": it never shows a price it is not sure of.

export interface NaffyPrice {
  /** In grosze. */
  regularMinor: number;
  /** A promotion's price, in grosze (none: no promotion now). */
  discountedMinor: number | null;
  /** The lowest price of the 30 days before the promotion, in grosze. */
  lowestMinor: number | null;
}

/** As the site shows it: "20,67 zł" with "37,00 zł" crossed out, … */
export interface NaffyPriceView {
  current: string;
  /** The price before the promotion, crossed out (none: no promotion). */
  regular: string | null;
  /** "Najniższa cena z ostatnich 30 dni przed obniżką: 37,00 zł". */
  lowest: string | null;
  /** For Google: the price paid now, in złote. */
  amount: number;
}

const PRODUCT_URL =
  /^https:\/\/(?:www\.)?naffy\.io\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/;

const NAFFY_ORIGIN = /^https:\/\/(?:www\.)?naffy\.io\//;

/** Whether a link is a product's page on Naffy (the only pages read). */
export function isNaffyProductUrl(url: string): boolean {
  return PRODUCT_URL.test(url.trim());
}

const isMinor = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** The price in a Naffy product page's HTML, if it is clear. */
export function parseNaffyPrice(
  html: string,
  now = new Date(),
): NaffyPrice | null {
  if (/"freeOfCharge":true/.test(html)) return null;
  const price = /"price":\{"currency":"([a-z]{3})","amount":(\d+)/.exec(html);
  if (!price || price[1] !== "pln") return null;
  const regularMinor = Number(price[2]);
  if (!isMinor(regularMinor)) return null;
  // One flat price only: a subscription or several prices are not shown.
  const prices = /"prices":\[(.*?)\]/.exec(html)?.[1] ?? "";
  if (
    /"type":"(?!flat-rate)/.test(prices) ||
    (prices.match(/"id":/g) ?? []).length > 1
  )
    return null;

  const promotion = /"promotion":(\{[^{}]*\})/.exec(html)?.[1];
  let discountedMinor: number | null = null;
  let lowestMinor: number | null = null;
  if (promotion) {
    try {
      const data = JSON.parse(promotion) as {
        discountedPrice?: unknown;
        end?: unknown;
        lowestPrice?: unknown;
      };
      const ended =
        typeof data.end === "string" && Date.parse(data.end) <= now.getTime();
      if (
        !ended &&
        isMinor(data.discountedPrice) &&
        data.discountedPrice < regularMinor
      ) {
        discountedMinor = data.discountedPrice;
        lowestMinor = isMinor(data.lowestPrice) ? data.lowestPrice : null;
      }
    } catch {
      return null;
    }
  }
  return { regularMinor, discountedMinor, lowestMinor };
}

const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});
const money = (minor: number) => PLN.format(minor / 100).replace(/ /g, " ");

export function naffyPriceView(price: NaffyPrice): NaffyPriceView {
  const promoted = price.discountedMinor !== null;
  return {
    current: money(price.discountedMinor ?? price.regularMinor),
    regular: promoted ? money(price.regularMinor) : null,
    lowest:
      promoted && price.lowestMinor !== null
        ? `Najniższa cena z ostatnich 30 dni przed obniżką: ${money(price.lowestMinor)}`
        : null,
    amount: (price.discountedMinor ?? price.regularMinor) / 100,
  };
}

/**
 * Reads a product's price from Naffy (a few seconds at most). The site
 * passes Next's fetch options to keep it for a while.
 */
export async function fetchNaffyPrice(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
): Promise<NaffyPrice | null> {
  if (!isNaffyProductUrl(url)) return null;
  try {
    const response = await fetch(url.trim(), {
      ...init,
      signal: AbortSignal.timeout(5000),
      headers: { accept: "text/html" },
    });
    // Followed redirects must stay on Naffy.
    if (!response.ok || !NAFFY_ORIGIN.test(response.url)) return null;
    return parseNaffyPrice(await response.text());
  } catch (error) {
    console.warn("[naffy-price]", url, error);
    return null;
  }
}
