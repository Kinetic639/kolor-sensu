import { describe, expect, it } from "vitest";
import { parsePublicSupabaseEnv, parseSecretSupabaseEnv } from "./env.js";

describe("Supabase environment validation", () => {
  it("validates public configuration independently from server secrets", () => {
    expect(
      parsePublicSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });

    expect(() => parseSecretSupabaseEnv({})).toThrow();
  });
});
