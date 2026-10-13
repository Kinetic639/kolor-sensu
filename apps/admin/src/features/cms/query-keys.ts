export const homeContentKeys = {
  all: ["admin", "cms", "home"] as const,
  detail: () => [...homeContentKeys.all, "detail"] as const,
};

export const roomsPageKeys = {
  all: ["admin", "cms", "rooms"] as const,
  detail: () => [...roomsPageKeys.all, "detail"] as const,
};

export const supportAreasKeys = {
  all: ["admin", "cms", "support-areas"] as const,
  detail: () => [...supportAreasKeys.all, "detail"] as const,
};

export const homeSectionsKeys = {
  all: ["admin", "cms", "home-sections"] as const,
  detail: () => [...homeSectionsKeys.all, "detail"] as const,
};
