import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  ColorField,
  ColorPalette,
  ColorSwatch,
  resourceColors,
} from "./color-field";

describe("resourceColors", () => {
  it("uses the chosen colour, with a light tint of it", () => {
    expect(resourceColors("#2f5fa7", 0)).toEqual({
      accent: "#2f5fa7",
      tint: "color-mix(in srgb, #2f5fa7 8%, var(--surface))",
    });
  });

  it("keeps the same automatic colour for the same id, wherever shown", () => {
    const id = "7f6ecfde-56dc-4045-91e1-a0b3cb71abd2";
    expect(resourceColors(null, id)).toEqual(resourceColors(null, id));
    expect(resourceColors(null, id).accent).toMatch(
      /^var\(--resource-[1-6]\)$/,
    );
    // Different ids spread over the automatic colours.
    const accents = new Set(
      Array.from(
        { length: 40 },
        (_, n) => resourceColors(null, `id-${n}`).accent,
      ),
    );
    expect(accents.size).toBeGreaterThanOrEqual(5);
  });

  it("falls back to the automatic colour by position", () => {
    expect(resourceColors(null, 0)).toEqual({
      accent: "var(--resource-1)",
      tint: "var(--resource-1-soft)",
    });
    expect(resourceColors(null, 7)).toEqual({
      accent: "var(--resource-2)",
      tint: "var(--resource-2-soft)",
    });
  });
});

describe("ColorSwatch", () => {
  it("is a coloured dot, named when it stands alone", () => {
    render(<ColorSwatch color="#2f5fa7" label="Kolor: Chaber" />);
    const swatch = screen.getByRole("img", { name: "Kolor: Chaber" });
    expect(swatch).toHaveStyle({ backgroundColor: "#2f5fa7" });
  });
});

function PaletteDemo({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <ColorPalette label="Paleta" onChange={setValue} value={value} />
      <output>{value ?? "brak"}</output>
    </>
  );
}

describe("ColorPalette", () => {
  it("picks a ready colour, each named", () => {
    render(<PaletteDemo />);
    fireEvent.click(screen.getByRole("radio", { name: "Chaber" }));
    expect(screen.getByRole("status")).toHaveTextContent("#2563eb");
    expect(screen.getByRole("radio", { name: "Chaber" })).toBeChecked();
  });
});

function FieldDemo({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <>
      <ColorField
        automaticColor="var(--resource-1)"
        label="Kolor gabinetu"
        onChange={setValue}
        value={value}
      />
      <output>{value ?? "automatycznie"}</output>
    </>
  );
}

describe("ColorField", () => {
  it("starts on the automatic colour and switches to a ready one", () => {
    render(<FieldDemo />);
    expect(screen.getByRole("radio", { name: /Automatycznie/ })).toBeChecked();
    expect(
      screen.getByText("Teraz przypisany automatycznie:"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Róż" }));
    expect(screen.getByRole("status")).toHaveTextContent("#db2777");
  });

  it("takes a colour typed by hand, once it is valid", () => {
    render(<FieldDemo />);
    const input = screen.getByLabelText("Kod koloru");
    fireEvent.change(input, { target: { value: "12" } });
    expect(screen.getByRole("status")).toHaveTextContent("automatycznie");
    fireEvent.blur(input);
    expect(
      screen.getByText("Podaj kolor w formacie #RRGGBB."),
    ).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "#1A7F5A" } });
    expect(screen.getByRole("status")).toHaveTextContent("#1a7f5a");
    expect(
      screen.queryByText("Podaj kolor w formacie #RRGGBB."),
    ).not.toBeInTheDocument();
  });

  it("does not jump while a code is being typed", () => {
    render(<FieldDemo />);
    const input = screen.getByLabelText("Kod koloru");
    // "#1A7" is a valid short code, but the person is still typing.
    fireEvent.change(input, { target: { value: "#1A7" } });
    expect(input).toHaveValue("#1A7");
    expect(screen.getByRole("status")).toHaveTextContent("automatycznie");
    // Leaving the field takes the short code.
    fireEvent.blur(input);
    expect(screen.getByRole("status")).toHaveTextContent("#11aa77");
  });

  it("takes a colour from the system picker", () => {
    render(<FieldDemo />);
    fireEvent.change(screen.getByLabelText("Wybierz dowolny kolor"), {
      target: { value: "#123456" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("#123456");
    expect(screen.getByLabelText("Kod koloru")).toHaveValue("#123456");
  });

  it("warns when a colour is too light to see", () => {
    render(<FieldDemo initial="#fde68a" />);
    expect(screen.getByRole("alert")).toHaveTextContent(/słabo widoczny/);
  });

  it("goes back to the automatic colour", () => {
    render(<FieldDemo initial="#2f5fa7" />);
    fireEvent.click(screen.getByRole("radio", { name: /Automatycznie/ }));
    expect(screen.getByRole("status")).toHaveTextContent("automatycznie");
  });
});
