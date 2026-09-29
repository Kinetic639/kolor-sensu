import { describe, expect, it } from "vitest";
import {
  personInitials,
  personName,
  specialistProfileSubmissionSchema,
} from "./specialist";

describe("personName", () => {
  it("joins the first and last name, skipping blanks", () => {
    expect(
      personName({ firstName: " Anna ", lastName: "Nowak-Kowalska" }),
    ).toBe("Anna Nowak-Kowalska");
    expect(personName({ firstName: "Anna", lastName: " " })).toBe("Anna");
    expect(personName({ firstName: "", lastName: "" })).toBe("");
  });
});

describe("personInitials", () => {
  it("takes the first letter of the first and the last name", () => {
    expect(
      personInitials({ firstName: "Anna Maria", lastName: "Nowak-Kowalska" }),
    ).toBe("AN");
    expect(personInitials({ firstName: "łucja", lastName: "Ćwik" })).toBe("ŁĆ");
    expect(personInitials({ firstName: "Anna", lastName: "" })).toBe("A");
  });
});

describe("specialistProfileSubmissionSchema", () => {
  it("wants a first and a last name, each on its own", () => {
    const result = specialistProfileSubmissionSchema.safeParse({
      firstName: "Anna",
      lastName: " ",
    });
    const messages = result.error?.issues.map((issue) => [
      issue.path.join("."),
      issue.message,
    ]);
    expect(messages).toContainEqual(["lastName", "Podaj nazwisko."]);
    expect(messages?.some(([path]) => path === "firstName")).toBe(false);
  });
});
