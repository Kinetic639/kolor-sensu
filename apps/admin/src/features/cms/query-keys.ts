export const homeContentKeys = {
  all: ["admin", "cms", "home"] as const,
  detail: () => [...homeContentKeys.all, "detail"] as const,
};
