// Prices and lengths as the public pages show them.

const money = (currency: string) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

/** `250 zł` */
export function formatPrice(offer: {
  priceMinor: number;
  currencyCode: string;
}) {
  return money(offer.currencyCode).format(offer.priceMinor / 100);
}

/** `50 min` */
export function formatDuration(minutes: number) {
  return `${minutes} min`;
}
