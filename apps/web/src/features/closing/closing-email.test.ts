import { describe, expect, it } from "vitest";
import { closingEmail } from "./closing-email";

describe("closingEmail", () => {
  const email = closingEmail(
    {
      specialistName: "Anna <Nowak>",
      visits: [
        {
          reference: "2610-004",
          serviceName: "Konsultacja",
          startsAt: "2026-10-05T08:00:00Z",
        },
        {
          reference: "2610-007",
          serviceName: "Terapia",
          startsAt: "2026-10-05T10:00:00Z",
        },
      ],
    },
    {
      portalUrl: "https://specjalista.example.invalid",
      timeZone: "Europe/Warsaw",
    },
  );

  it("how many, which, and the way to close them", () => {
    expect(email.subject).toBe("Wizyty do zamknięcia: 2");
    expect(email.text).toContain("2610-004 · Konsultacja · pon. 05.10, 10:00");
    expect(email.text).toContain(
      "https://specjalista.example.invalid/rezerwacje?zakres=do-zamkniecia",
    );
  });

  it("their name as text in the HTML", () => {
    expect(email.html).toContain("Anna &lt;Nowak&gt;");
    expect(email.html).not.toContain("<Nowak>");
  });
});
