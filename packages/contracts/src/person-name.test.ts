import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  byLastName,
  fullName,
  nameParts,
  personNameFields,
  sortName,
} from "./person-name";

const schema = z.object(personNameFields);

describe("a person's name", () => {
  it("needs both parts", () => {
    expect(
      schema.safeParse({ firstName: " Anna ", lastName: "Nowak" }).data,
    ).toEqual({
      firstName: "Anna",
      lastName: "Nowak",
    });
    const missing = schema.safeParse({ firstName: "Anna", lastName: " " });
    expect(missing.error?.issues.map((issue) => issue.message)).toEqual([
      "Podaj nazwisko.",
    ]);
  });

  it("reads whole, and by the last name for lists", () => {
    expect(fullName({ firstName: "Jan", lastName: "de la Cruz" })).toBe(
      "Jan de la Cruz",
    );
    expect(sortName({ firstName: "Anna", lastName: "Nowak" })).toBe(
      "Nowak Anna",
    );
    expect(fullName({ firstName: "Anna" })).toBe("Anna");
  });

  it("takes the parts as kept, else splits the whole at its last space", () => {
    expect(nameParts("Jan de la Cruz", "Jan", "de la Cruz")).toEqual({
      firstName: "Jan",
      lastName: "de la Cruz",
    });
    expect(nameParts(" Anna Maria Nowak ")).toEqual({
      firstName: "Anna Maria",
      lastName: "Nowak",
    });
    expect(nameParts("Anna")).toEqual({ firstName: "Anna", lastName: "" });
    expect(nameParts(null)).toEqual({ firstName: "", lastName: "" });
  });

  it("sorts by the last name, as Polish does", () => {
    const people = [
      { firstName: "Ewa", lastName: "Żak" },
      { firstName: "Adam", lastName: "Łukasik" },
      { firstName: "Zofia", lastName: "Lis" },
      { firstName: "Anna", lastName: "Lis" },
    ];
    expect([...people].sort(byLastName).map(sortName)).toEqual([
      "Lis Anna",
      "Lis Zofia",
      "Łukasik Adam",
      "Żak Ewa",
    ]);
  });
});
