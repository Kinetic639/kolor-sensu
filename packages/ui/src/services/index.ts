// The centre's offer: the roster (a service a row, opening in place on
// tabs) and its state in the URL; a service's page's tabs; the pieces a
// service is shown with (its mark, who leads it, its offers and visits).
export {
  durationsLabel,
  loadServiceListParams,
  priceRange,
  SERVICE_SEGMENTS,
  SERVICE_SORTS,
  serviceListHref,
  serviceListParsers,
  serviceReadiness,
  serviceSegments,
  serviceSortOptions,
  serviceStatus,
  servicesWeekSummary,
  serviceWeekNav,
  shownServices,
  sitePrice,
} from "./params";
export type { ReadinessItem, ServiceListParams, ServiceSort } from "./params";
export {
  loadServicePageParams,
  SERVICE_PAGE_TABS,
  servicePageHref,
  servicePageParsers,
  servicePageTabs,
} from "./page-params";
export type { ServicePageParams, ServicePageTab } from "./page-params";
export { arrangementOf, OfferArrangement } from "./offer-arrangement";
export type { ArrangeAction } from "./offer-arrangement";
export { ServiceRoster, servicesLabel } from "./service-roster";
export { ServiceSearch } from "./service-search";
export {
  OfferAvatars,
  ServiceMark,
  ServiceOfferTable,
  ServicePrice,
  ServiceReadiness,
  ServiceSiteTile,
  ServiceVisitTable,
  ServiceWeekBars,
} from "./service-parts";
export type { ServiceOffer, ServiceRow } from "./types";
