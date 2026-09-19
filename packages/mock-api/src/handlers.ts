import { sampleService } from "@repo/mock-data";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/api/__mock/services", () => {
    return HttpResponse.json([sampleService]);
  }),
];
