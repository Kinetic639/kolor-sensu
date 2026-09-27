export const homeContentKeys = {
  all: ["admin", "cms", "home"] as const,
  detail: () => [...homeContentKeys.all, "detail"] as const,
};

export const roomsPageKeys = {
  all: ["admin", "cms", "rooms"] as const,
  detail: () => [...roomsPageKeys.all, "detail"] as const,
};
