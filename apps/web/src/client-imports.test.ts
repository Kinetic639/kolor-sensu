import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// A client module that imports the public-site barrel ships all of it to
// every page's browser bundle (zod and its locales, GSAP…): error.tsx did,
// for about 180 KB on the home page. Client modules import the single
// file they need instead (e.g. @repo/ui/public-site/actions).

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
  it("do not import the whole public-site barrel", () => {
    const offenders = sources(join(__dirname))
      .filter((path) => {
        const code = readFileSync(path, "utf8");
        return (
          /^["']use client["']/.test(code) &&
          /^import (?!type)[^;]*from "@repo\/ui\/public-site";/m.test(code)
        );
      })
      .map((path) => path.slice(__dirname.length + 1));
    expect(offenders).toEqual([]);
  });
});
