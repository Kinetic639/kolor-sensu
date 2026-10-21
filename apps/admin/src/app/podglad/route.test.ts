import { verifyPreviewToken } from "@repo/app-runtime/cms-preview";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The admin check is the portal's own (redirects for anyone else): here a
// stand-in that lets the admin through or throws like a redirect.
const requirePortalRole = vi.fn();
vi.mock("@/lib/auth", () => ({ requirePortalRole }));

const { GET } = await import("./route");

const secret = "a-test-secret-that-is-long-enough-0123456789";

function open(strona: string) {
  return new Request(
    `https://admin.example.invalid/podglad?strona=${encodeURIComponent(strona)}`,
  );
}

beforeEach(() => {
  vi.stubEnv("CMS_PREVIEW_SECRET", secret);
  vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://ks.example.invalid");
  requirePortalRole.mockResolvedValue({ status: "authorized" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /podglad", () => {
  it("sends the admin to the site's preview of the page", async () => {
    const response = await GET(open("gabinety"));

    expect(response.status).toBe(303);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://ks.example.invalid");
    expect(location.pathname).toBe("/api/preview");
    expect(
      verifyPreviewToken(location.searchParams.get("token")!, { secret }),
    ).toEqual({ ok: true, path: "/gabinety" });
  });

  it("previews the homepage at the site's root", async () => {
    const response = await GET(open("glowna"));
    const location = new URL(response.headers.get("location")!);
    expect(
      verifyPreviewToken(location.searchParams.get("token")!, { secret }),
    ).toEqual({ ok: true, path: "/" });
  });

  it("previews an article's draft by its id, nothing else", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const response = await GET(
      new Request(`https://admin.example.invalid/podglad?artykul=${id}`),
    );
    const location = new URL(response.headers.get("location")!);
    expect(
      verifyPreviewToken(location.searchParams.get("token")!, { secret }),
    ).toEqual({ ok: true, path: `/edukacja/artykuly/podglad/${id}` });

    const bad = await GET(
      new Request("https://admin.example.invalid/podglad?artykul=..%2F..%2Fx"),
    );
    expect(bad.status).toBe(404);
  });

  it("lets only an admin in", async () => {
    requirePortalRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(open("glowna"))).rejects.toThrow("NEXT_REDIRECT");
  });

  it("refuses a page the CMS does not have", async () => {
    const response = await GET(open("//evil.example"));
    expect(response.status).toBe(404);
    expect(response.headers.get("location")).toBeNull();
  });

  it("says so when the preview is not configured", async () => {
    vi.stubEnv("CMS_PREVIEW_SECRET", "");
    const response = await GET(open("glowna"));
    expect(response.status).toBe(500);
  });
});
