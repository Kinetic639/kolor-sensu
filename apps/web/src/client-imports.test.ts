import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A client module that imports a barrel (@repo/ui/public-site,
// @repo/ui/booking) ships all of it to the page's browser bundle (zod and
// its locales, GSAP…): error.tsx did, for about 180 KB on the home page,
// and the contact form did on Kontakt. Client modules import the single
// file they need instead (e.g. @repo/ui/public-site/actions,
// @repo/ui/booking/fields).

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)
      ? [path]
      : [];
  });
}

describe("client modules", () => {
  it("do not import a whole barrel", () => {
    const offenders = sources(join(__dirname))
      .filter((path) => {
        const code = readFileSync(path, "utf8");
        return (
          /^["']use client["']/.test(code) &&
          /^import (?!type)[^;]*from "@repo\/ui\/(public-site|booking)";/m.test(
            code,
          )
        );
      })
      .map((path) => path.slice(__dirname.length + 1));
    expect(offenders).toEqual([]);
  });
});
