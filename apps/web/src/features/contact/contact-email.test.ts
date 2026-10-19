import { describe, expect, it } from "vitest";
import {
  clientCopy,
  centreNotice,
  gmailComposeUrl,
  mailtoUrl,
  replyTemplate,
} from "./contact-email";

const message = {
  name: "Ola Nowak",
  email: "ola@example.invalid",
  phone: "600 100 200",
  message: "Czy przyjmujecie pary?\nNajchętniej wieczorem.",
};
const centre = {
  phoneLabel: "+48 61 123 45 67",
  email: "kontakt@example.invalid",
};

describe("the reply's template", () => {
  it("greets the visitor, leaves room for the answer, signs and quotes the question", () => {
    const text = replyTemplate(message, centre);
    expect(text).toMatch(/^Dzień dobry,/);
    expect(text).toContain("[Tu Twoja odpowiedź]");
    expect(text).toContain("Zespół Kolor Sensu");
    expect(text).toContain("+48 61 123 45 67");
    expect(text).toContain("> Czy przyjmujecie pary?");
    expect(text).toContain("> Najchętniej wieczorem.");
  });
});

describe("the reply links", () => {
  it("open Gmail's compose window with the address, subject and template", () => {
    const url = new URL(
      gmailComposeUrl(
        "ola@example.invalid",
        "Re: Twoja wiadomość",
        "Dzień dobry",
      ),
    );
    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe("ola@example.invalid");
    expect(url.searchParams.get("su")).toBe("Re: Twoja wiadomość");
    expect(url.searchParams.get("body")).toBe("Dzień dobry");
  });

  it("open the mail program with the same, spaces kept as spaces", () => {
    const url = mailtoUrl(
      "ola@example.invalid",
      "Re: Twoja wiadomość",
      "Dzień dobry,\nOla",
    );
    expect(url).toMatch(/^mailto:ola@example\.invalid\?subject=/);
    expect(url).not.toContain("+");
    expect(decodeURIComponent(url.split("body=")[1]!)).toBe(
      "Dzień dobry,\nOla",
    );
  });
});

describe("the centre's notice", () => {
  it("goes to the centre, replies go to the visitor, with both reply buttons", () => {
    const notice = centreNotice(message, centre);
    expect(notice.to).toBe("kontakt@example.invalid");
    expect(notice.replyTo).toBe("ola@example.invalid");
    expect(notice.subject).toBe("Nowa wiadomość ze strony: Ola Nowak");
    expect(notice.text).toContain("600 100 200");
    expect(notice.text).toContain("Czy przyjmujecie pary?");
    expect(notice.html).toContain("Odpowiedz w Gmailu");
    expect(notice.html).toContain("Odpowiedz w programie pocztowym");
    expect(notice.html).toContain("https://mail.google.com/mail/?");
    expect(notice.html).toContain("mailto:ola@example.invalid");
  });

  it("keeps the visitor's words as text, never as markup", () => {
    const notice = centreNotice(
      { ...message, name: "<b>Ola</b>", message: "<script>x</script>" },
      centre,
    );
    expect(notice.html).not.toContain("<script>");
    expect(notice.html).toContain("&lt;script&gt;");
  });
});

describe("the visitor's copy", () => {
  it("thanks, repeats the message, and gives the numbers for a crisis", () => {
    const copy = clientCopy(message, centre);
    expect(copy.to).toBe("ola@example.invalid");
    expect(copy.subject).toBe("Otrzymaliśmy Twoją wiadomość – Kolor Sensu");
    expect(copy.text).toContain("Czy przyjmujecie pary?");
    expect(copy.text).toContain("112");
    expect(copy.text).toContain("800 702 222");
  });
});
