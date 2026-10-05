import { describe, expect, it } from "vitest";
import { inviteEmail } from "./invite-email";

describe("inviteEmail", () => {
  const email = inviteEmail(
    {
      email: "anna@example.invalid",
      firstName: "Anna <b>",
      lastName: "Nowak",
      role: "admin",
    },
    "https://admin.example.invalid/auth/confirm?token_hash=h&type=invite",
  );

  it("says who invites them where, with the link to set a password", () => {
    expect(email.subject).toBe("Zaproszenie do panelu Kolor Sensu");
    expect(email.text).toContain("Dzień dobry, Anna <b>!");
    expect(email.text).toContain(
      "https://admin.example.invalid/auth/confirm?token_hash=h&type=invite",
    );
    expect(email.html).toContain(
      'href="https://admin.example.invalid/auth/confirm?token_hash=h&amp;type=invite"',
    );
  });

  it("keeps their name as text in the HTML", () => {
    expect(email.html).toContain("Anna &lt;b&gt;");
    expect(email.html).not.toContain("Anna <b>");
  });
});
