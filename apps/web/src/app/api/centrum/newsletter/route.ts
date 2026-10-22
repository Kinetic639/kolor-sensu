import { newsletterIssueRequestSchema } from "@repo/contracts/newsletter-issue";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  cancelIssueAsAdmin,
  previewNewsletterIssue,
  sendIssueAsAdmin,
  sendNewsletterTest,
} from "@/features/newsletter/issues-server";
import { getPublicSupabaseEnvironment } from "@/lib/supabase/environment";

// The newsletter's issues for the admin's portal (Newsletter → Wydania):
// the preview and a test to the admin's own address, from the draft as it
// is in the editor; sending (now or at a time) and taking a scheduled one
// back, as the admin. The admin's token comes with the request; the
// database says whether they are one, and checks it again in each step.

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = /^Bearer (\S+)$/.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const asAdmin = createSupabasePublicClient(
    getPublicSupabaseEnvironment(),
    token,
  );
  const [{ data: isAdmin }, { data: user }] = await Promise.all([
    asAdmin.rpc("has_role", { required_role: "admin" }),
    asAdmin.auth.getUser(token),
  ]);
  if (isAdmin !== true || !user.user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = newsletterIssueRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    switch (body.action) {
      case "preview":
        return NextResponse.json(await previewNewsletterIssue(body.draft));
      case "test": {
        const to = user.user.email;
        if (!to) {
          return NextResponse.json({
            ok: false,
            message: "Twoje konto nie ma adresu e-mail.",
          });
        }
        await sendNewsletterTest(body.draft, to);
        return NextResponse.json({ ok: true, to });
      }
      case "send": {
        const outcome = await sendIssueAsAdmin(asAdmin, body.id, body.sendAt);
        if (outcome.ok) revalidatePath("/newsletter", "layout");
        return NextResponse.json(outcome);
      }
      case "cancel": {
        const outcome = await cancelIssueAsAdmin(asAdmin, body.id);
        if (outcome.ok) revalidatePath("/newsletter", "layout");
        return NextResponse.json(outcome);
      }
    }
  } catch (error) {
    console.error(`[newsletter] ${body.action} failed:`, error);
    return NextResponse.json(
      { ok: false, message: "Coś poszło nie tak. Spróbuj ponownie za chwilę." },
      { status: 500 },
    );
  }
}
