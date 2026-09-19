import { z } from "zod";

export const publicSupabaseEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const secretSupabaseEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

export type PublicSupabaseEnv = z.infer<typeof publicSupabaseEnvSchema>;
export type SecretSupabaseEnv = z.infer<typeof secretSupabaseEnvSchema>;

export function parsePublicSupabaseEnv(environment: unknown) {
  return publicSupabaseEnvSchema.parse(environment);
}

export function parseSecretSupabaseEnv(environment: unknown) {
  return secretSupabaseEnvSchema.parse(environment);
}
