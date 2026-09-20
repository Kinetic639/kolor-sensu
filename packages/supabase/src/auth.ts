import type { Database } from "@repo/contracts/database";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type PortalProfile = Database["public"]["Tables"]["profiles"]["Row"];

export const loginSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail."),
  password: z.string().min(1, "Podaj hasło."),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Podaj poprawny adres e-mail."),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Hasło musi mieć co najmniej 8 znaków."),
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "Hasła muszą być identyczne.",
    path: ["passwordConfirmation"],
  });

type PortalAccess = "allowed" | "forbidden" | "unauthenticated";

export function resolvePortalAccess({
  authenticated,
  profileActive,
  requiredRole,
  roles,
}: {
  authenticated: boolean;
  profileActive: boolean;
  requiredRole: AppRole;
  roles: readonly AppRole[];
}): PortalAccess {
  if (!authenticated) {
    return "unauthenticated";
  }

  if (!profileActive || !roles.includes(requiredRole)) {
    return "forbidden";
  }

  return "allowed";
}

export type PortalAuthorization =
  | {
      status: "unauthenticated";
      user: null;
      profile: null;
      roles: AppRole[];
    }
  | {
      status: "forbidden";
      user: User;
      profile: PortalProfile | null;
      roles: AppRole[];
    }
  | {
      status: "allowed";
      user: User;
      profile: PortalProfile;
      roles: AppRole[];
    };

export async function getCurrentUser(client: SupabaseClient<Database>) {
  const {
    data: { user },
  } = await client.auth.getUser();

  return user;
}

export async function getCurrentProfile(
  client: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, first_name, last_name, avatar_url, active, created_at, updated_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getProfileByIdAdmin(
  client: SupabaseClient<Database>,
  userId: string,
) {
  return getCurrentProfile(client, userId);
}

export async function getCurrentRoles(
  client: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data.map(({ role }) => role);
}

export async function getPortalAuthorization(
  client: SupabaseClient<Database>,
  requiredRole: AppRole,
): Promise<PortalAuthorization> {
  const user = await getCurrentUser(client);

  if (!user) {
    return { status: "unauthenticated", user: null, profile: null, roles: [] };
  }

  const [profile, roles] = await Promise.all([
    getCurrentProfile(client, user.id),
    getCurrentRoles(client, user.id),
  ]);
  const status = resolvePortalAccess({
    authenticated: true,
    profileActive: profile?.active === true,
    requiredRole,
    roles,
  });

  if (status !== "allowed" || !profile) {
    return { status: "forbidden", user, profile, roles };
  }

  return { status, user, profile, roles };
}
