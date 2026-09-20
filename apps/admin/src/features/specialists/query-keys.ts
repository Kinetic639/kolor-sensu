export const specialistsKeys = {
  all: ["admin", "specialists"] as const,
  lists: () => [...specialistsKeys.all, "list"] as const,
  list: (filters: { search: string; status: string; publication: string }) =>
    [...specialistsKeys.lists(), filters] as const,
  details: () => [...specialistsKeys.all, "detail"] as const,
  detail: (id: string) => [...specialistsKeys.details(), id] as const,
  services: (id: string) =>
    [...specialistsKeys.detail(id), "services"] as const,
  draft: (id: string) => [...specialistsKeys.detail(id), "draft"] as const,
};
