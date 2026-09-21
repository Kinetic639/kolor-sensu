export const workshopsKeys = {
  all: ["admin", "workshops"] as const,
  lists: () => [...workshopsKeys.all, "list"] as const,
  list: (filters: Record<string, string>) =>
    [...workshopsKeys.lists(), filters] as const,
  details: () => [...workshopsKeys.all, "detail"] as const,
  detail: (id: string) => [...workshopsKeys.details(), id] as const,
  formOptions: () => [...workshopsKeys.all, "form-options"] as const,
};
