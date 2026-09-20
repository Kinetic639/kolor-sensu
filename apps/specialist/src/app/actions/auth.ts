"use server";

import {
  forgotPasswordSchema,
  getPortalAuthorization,
  loginSchema,
  resetPasswordSchema,
} from "@repo/supabase";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const requiredRole = "specialist" as const;

export async function login(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    redirect("/login?error=invalid-input");
  }

  const client = await createClient();
  const { error } = await client.auth.signInWithPassword(result.data);

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  const authorization = await getPortalAuthorization(client, requiredRole);

  if (authorization.status === "allowed") {
    redirect("/");
  }

  redirect("/access-denied");
}

export async function logout() {
  const client = await createClient();
  await client.auth.signOut();
  redirect("/login?status=signed-out");
}

export async function requestPasswordReset(formData: FormData) {
  const result = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    redirect("/forgot-password?error=invalid-input");
  }

  const client = await createClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_SPECIALIST_URL ?? "http://localhost:3002";
  const redirectTo = new URL(
    "/auth/callback?next=/reset-password",
    baseUrl,
  ).toString();
  const { error } = await client.auth.resetPasswordForEmail(result.data.email, {
    redirectTo,
  });

  if (error) {
    redirect("/forgot-password?error=delivery-failed");
  }

  redirect("/forgot-password?status=sent");
}

export async function resetPassword(formData: FormData) {
  const result = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirmation: formData.get("passwordConfirmation"),
  });

  if (!result.success) {
    redirect("/reset-password?error=invalid-input");
  }

  const client = await createClient();
  const { error } = await client.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    redirect("/reset-password?error=update-failed");
  }

  await client.auth.signOut();
  redirect("/login?status=password-updated");
}
