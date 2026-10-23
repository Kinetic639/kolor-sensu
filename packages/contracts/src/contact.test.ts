import { describe, expect, it } from "vitest";
import { contactMessageInputSchema } from "./contact";

const valid = {
  name: "Ola",
  email: "ola@example.invalid",
  phone: "",
  message: "Czy przyjmujecie pary?",
  consent: true as const,
};

describe("the contact form", () => {
  it("takes a name, an e-mail, a message and the consent; the phone is optional", () => {
    expect(contactMessageInputSchema.parse(valid)).toEqual(valid);
  });

  it("says what is wrong with each field", () => {
    const result = contactMessageInputSchema.safeParse({
      name: " ",
      email: "ola@",
      phone: "abc",
      message: "",
      consent: false,
    });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((issue) => issue.path[0]);
    expect(new Set(fields)).toEqual(
      new Set(["name", "email", "phone", "message", "consent"]),
    );
  });
});
