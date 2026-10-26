import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";
import type { ConfirmationContent } from "./confirmation-content";
import { ConfirmationEmail } from "./confirmation-email";

const content: ConfirmationContent = {
  subject: "Potwierdzenie wizyty KS-1",
  preview: "Konsultacja, środa",
  heading: "Twoja wizyta jest potwierdzona",
  greeting: "Dzień dobry, Jan <b>Kowalski</b>!",
  intro: "Dziękujemy za rezerwację i płatność.",
  rows: [
    ["Usługa", "Konsultacja"],
    ["Numer rezerwacji", "KS-1"],
  ],
  manageUrl: "https://kolorsensu.pl/wizyta/link-token",
  buttonLabel: "Zobacz swoją wizytę",
  note: "W załączniku jest plik, który doda wizytę do Twojego kalendarza.",
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

  it("ends with help in a crisis: 112 and the site's page about it (#247)", async () => {
    const html = await render(<ConfirmationEmail content={content} />);
    expect(html).toContain("dzwoń pod 112");
    expect(html).toContain('href="https://kolorsensu.pl/pomoc-w-kryzysie"');
  });

  it("escapes what the client typed", async () => {
    const html = await render(<ConfirmationEmail content={content} />);
    expect(html).not.toContain("<b>Kowalski</b>");
    expect(html).toContain("&lt;b&gt;Kowalski&lt;/b&gt;");
  });
});
