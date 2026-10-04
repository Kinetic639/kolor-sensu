import { createSupabasePublicClient } from "@repo/supabase/public";
import { portalUserIdByEmail } from "@repo/supabase/access";
import { NextResponse } from "next/server";
import { inviteAdmin } from "@/features/access/invite-admin";
import { inviteEmail } from "@/features/access/invite-email";
import { emailSender, sendEmail } from "@/lib/email";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";
import { createSecretClient } from "@/lib/supabase/secret";

// The admin's portal invites a new admin (Ustawienia → Dostęp). The
// signed-in admin's token comes with the request (the database says
// whether they are one); the account, the role and the e-mail are made
// here, with the service key. The invitation's link leads to the admin's
// portal (ADMIN_URL), where it signs them in to set their password.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const asUser = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const secret = createSecretClient();
  const body: unknown = await request.json().catch(() => null);

  try {
    const answer = await inviteAdmin(body, {
      isAdmin: async () => {
        const { data } = await asUser.rpc("has_role", {
          required_role: "admin",
        });
        return data === true;
      },
      findUser: (email) => portalUserIdByEmail(secret, email),
      hasAdminRole: async (userId) => {
        const { data, error } = await secret
          .from("user_roles")
          .select("user_id")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (error) throw error;
        return Boolean(data);
      },
      grant: async (userId) => {
        const { error } = await secret
          .from("user_roles")
          .upsert(
            { user_id: userId, role: "admin" },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          );
        if (error) throw error;
      },
      createInvite: async (invite) => {
        const { data, error } = await secret.auth.admin.generateLink({
          type: "invite",
          email: invite.email,
          options: {
            data: { first_name: invite.firstName, last_name: invite.lastName },
          },
        });
        if (error) throw error;
        return {
          userId: data.user.id,
          tokenHash: data.properties.hashed_token,
        };
      },
      sendInvite: async (invite, link) => {
        try {
          const message = inviteEmail(invite, link);
          await sendEmail(
            { from: emailSender(), to: invite.email, ...message },
            `admin-invite:${invite.email}:${link.slice(-16)}`,
          );
          return true;
        } catch (error) {
          console.error("[access] the invitation e-mail failed:", error);
          return false;
        }
      },
      adminUrl: process.env.ADMIN_URL || "http://localhost:3001",
    });
    return NextResponse.json(answer.body, { status: answer.status });
  } catch (error) {
    console.error("[access] the invitation failed:", error);
    return NextResponse.json(
      { ok: false, message: "Nie udało się wysłać zaproszenia." },
      { status: 500 },
    );
  }
}
