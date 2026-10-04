import {
  accessMessage,
  adminInviteSchema,
  type AdminInvite,
  type AdminInviteResult,
} from "@repo/contracts/access";

// The admin's portal invites a new admin (Ustawienia → Dostęp) through
// the site, which holds the service key and the e-mails. Someone with an
// account already (a specialist) is given the access at once; a new
// address gets an account, the access, and an e-mail with the link that
// signs them in to set their password. The link comes back too, to pass
// on if the e-mail did not go (until the domain is verified, Resend only
// delivers to its own account).

export interface InviteDeps {
  /** The one asking is an admin (their token, checked by the database). */
  isAdmin: () => Promise<boolean>;
  findUser: (email: string) => Promise<string | null>;
  hasAdminRole: (userId: string) => Promise<boolean>;
  grant: (userId: string) => Promise<void>;
  createInvite: (
    invite: AdminInvite,
  ) => Promise<{ userId: string; tokenHash: string }>;
  /** Sends the invitation; false when it did not go. */
  sendInvite: (invite: AdminInvite, link: string) => Promise<boolean>;
  adminUrl: string;
}

type Answer = { status: number; body: AdminInviteResult };

const refused = (
  status: number,
  code: string,
  fields?: Record<string, string>,
): Answer => ({
  status,
  body: { ok: false, message: accessMessage(code), fields },
});

export async function inviteAdmin(
  body: unknown,
  deps: InviteDeps,
): Promise<Answer> {
  if (!(await deps.isAdmin())) return refused(403, "forbidden");
  const parsed = adminInviteSchema.safeParse(body);
  if (!parsed.success) {
    return refused(
      400,
      "invalid",
      Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ]),
      ),
    );
  }
  const invite = parsed.data;

  const existing = await deps.findUser(invite.email);
  if (existing) {
    if (await deps.hasAdminRole(existing)) return refused(409, "already_admin");
    await deps.grant(existing);
    return { status: 200, body: { ok: true, status: "granted" } };
  }

  const { userId, tokenHash } = await deps.createInvite(invite);
  await deps.grant(userId);
  const link = new URL("/auth/confirm", deps.adminUrl);
  link.searchParams.set("token_hash", tokenHash);
  link.searchParams.set("type", "invite");
  link.searchParams.set("next", "/reset-password");
  const emailed = await deps.sendInvite(invite, link.toString());
  return {
    status: 201,
    body: { ok: true, status: "invited", emailed, link: link.toString() },
  };
}
