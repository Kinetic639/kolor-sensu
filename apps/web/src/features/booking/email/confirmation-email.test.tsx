import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import type { ConfirmationContent } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";

const content: ConfirmationContent = {
  subject: "Potwierdzenie wizyty KS-1",
  preview: "Konsultacja, środa",
  greeting: "Dzień dobry, Jan <b>Kowalski</b>!",
  rows: [
    ["Usługa", "Konsultacja"],
    ["Numer rezerwacji", "KS-1"],
  ],
  manageUrl: "https://kolorsensu.pl/wizyta/link-token",
  contactLine: "+48 600 100 200",
  text: "",
  ics: "",
};

describe("ConfirmationEmail", () => {
  it("renders the details, the link and the contact, in Polish", async () => {
    const html = await render(<ConfirmationEmail content={content} />);
    expect(html).toContain('lang="pl"');
    expect(html).toContain("Twoja wizyta jest potwierdzona");
    expect(html).toContain("Numer rezerwacji");
    expect(html).toContain('href="https://kolorsensu.pl/wizyta/link-token"');
    expect(html).toContain("+48 600 100 200");
  });

  it("escapes what the client typed", async () => {
    const html = await render(<ConfirmationEmail content={content} />);
    expect(html).not.toContain("<b>Kowalski</b>");
    expect(html).toContain("&lt;b&gt;Kowalski&lt;/b&gt;");
  });
});
