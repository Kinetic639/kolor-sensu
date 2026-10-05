import type { AdminInvite } from "@repo/contracts/access";

// The invitation to the admin's portal: who they are invited as, the link
// that signs them in to set their password, and that it does not last.

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function inviteEmail(invite: AdminInvite, link: string) {
  const place =
    invite.role === "specialist"
      ? "portalu specjalisty Kolor Sensu"
      : "panelu administracyjnego centrum Kolor Sensu";
  const subject =
    invite.role === "specialist"
      ? "Zaproszenie do portalu specjalisty Kolor Sensu"
      : "Zaproszenie do panelu Kolor Sensu";
  const text = [
    `Dzień dobry, ${invite.firstName}!`,
    "",
    `Masz zaproszenie do ${place}.`,
    "Kliknij link, aby ustawić hasło i się zalogować:",
    link,
    "",
    "Link działa przez ograniczony czas. Jeśli wygaśnie, poproś o nowe zaproszenie.",
    "",
    "Kolor Sensu",
  ].join("\n");
  const html = `<!doctype html>
<html lang="pl"><body style="margin:0;background:#f6f7f5;font-family:Arial,sans-serif;color:#1f2a24">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:16px">Dzień dobry, ${escape(invite.firstName)}!</p>
<p style="font-size:15px;line-height:22px">Masz zaproszenie do ${place}. Kliknij przycisk, aby ustawić hasło i się zalogować.</p>
<p style="margin:28px 0"><a href="${escape(link)}" style="background:#45684a;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Ustaw hasło</a></p>
<p style="font-size:13px;line-height:20px;color:#5b6660">Link działa przez ograniczony czas. Jeśli wygaśnie, poproś o nowe zaproszenie.</p>
<p style="font-size:13px;color:#5b6660">Kolor Sensu</p>
</div></body></html>`;
  return { subject, text, html };
}
