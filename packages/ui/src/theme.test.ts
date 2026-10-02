import { describe, expect, it } from "vitest";
import { applyTheme, parseTheme, THEME_COOKIE } from "./theme";

describe("the colour theme", () => {
  it("reads the saved theme, the device's setting otherwise", () => {
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme(undefined)).toBe("system");
    expect(parseTheme("purple")).toBe("system");
  });

  it("switches the page and remembers the choice", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
  });
});
