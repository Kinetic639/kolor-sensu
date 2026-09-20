export const servicesKeys = {
  all: ["admin", "services"] as const,
  lists: () => [...servicesKeys.all, "list"] as const,
  list: (filters: Record<string, string>) =>
    [...servicesKeys.lists(), filters] as const,
  details: () => [...servicesKeys.all, "detail"] as const,
  detail: (id: string) => [...servicesKeys.details(), id] as const,
  offers: (id: string) => [...servicesKeys.detail(id), "offers"] as const,
};
