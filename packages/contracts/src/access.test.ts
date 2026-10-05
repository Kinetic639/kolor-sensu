import { describe, expect, it } from "vitest";
import { accessMessage, adminInviteSchema } from "./access";

describe("adminInviteSchema", () => {
  it("the address (lower case) and the name", () => {
    expect(
      adminInviteSchema.parse({
        email: " Anna.Nowak@Example.invalid ",
        firstName: " Anna ",
        lastName: "Nowak",
      }),
    ).toEqual({
      email: "anna.nowak@example.invalid",
      firstName: "Anna",
      lastName: "Nowak",
      role: "admin",
    });
    expect(
      adminInviteSchema.parse({
        email: "a@example.invalid",
        firstName: "A",
        lastName: "B",
        role: "specialist",
      }).role,
    ).toBe("specialist");
  });

  it("says what is missing", () => {
    const result = adminInviteSchema.safeParse({
      email: "nie-adres",
      firstName: "",
      lastName: "",
    });
    expect(
      Object.fromEntries(
        result.error!.issues.map((issue) => [issue.path[0], issue.message]),
      ),
    ).toEqual({
      email: "Podaj poprawny adres e-mail.",
      firstName: "Podaj imię.",
      lastName: "Podaj nazwisko.",
    });
  });
});

describe("accessMessage", () => {
  it("why access could not be changed, in Polish", () => {
    expect(accessMessage("own_access")).toBe(
      "Nie możesz odebrać dostępu sobie.",
    );
    expect(accessMessage("last_admin")).toBe(
      "Centrum musi mieć co najmniej jednego administratora.",
    );
    expect(accessMessage("whatever")).toBe(
      "Nie udało się zmienić dostępu. Spróbuj ponownie.",
    );
  });
});
