export const roomsKeys = {
  all: ["admin", "rooms"] as const,
  lists: () => [...roomsKeys.all, "list"] as const,
  list: (filters: Record<string, string>) =>
    [...roomsKeys.lists(), filters] as const,
  detail: (id: string) => [...roomsKeys.all, "detail", id] as const,
  publicProfile: (id: string) =>
    [...roomsKeys.detail(id), "public-profile"] as const,
  openingHours: (id: string) =>
    [...roomsKeys.detail(id), "opening-hours"] as const,
  availability: (id: string) =>
    [...roomsKeys.detail(id), "availability"] as const,
};

export const locationsKeys = {
  all: ["admin", "locations"] as const,
};
