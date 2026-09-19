import { setupWorker } from "msw/browser";
import { handlers } from "./handlers.js";

export const mockWorker = setupWorker(...handlers);
