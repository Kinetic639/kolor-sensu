import { describe, expect, it, vi } from "vitest";
import { inviteAdmin, type InviteDeps } from "./invite-admin";

const body = {
  email: "Anna@Example.invalid",
  firstName: "Anna",
  lastName: "Nowak",
};

function deps(overrides: Partial<InviteDeps> = {}): InviteDeps {
  return {
    isAdmin: vi.fn().mockResolvedValue(true),
    findUser: vi.fn().mockResolvedValue(null),
    hasAdminRole: vi.fn().mockResolvedValue(false),
    grant: vi.fn().mockResolvedValue(undefined),
    createInvite: vi
      .fn()
      .mockResolvedValue({ userId: "u-new", tokenHash: "hash-1" }),
    sendInvite: vi.fn().mockResolvedValue(true),
    adminUrl: "https://admin.example.invalid",
    ...overrides,
  };
}

describe("inviteAdmin", () => {
  it("a new address: an account invited, made an admin, the link e-mailed", async () => {
    const given = deps();
    const answer = await inviteAdmin(body, given);
    const link =
      "https://admin.example.invalid/auth/confirm?token_hash=hash-1&type=invite&next=%2Freset-password";
    expect(answer).toEqual({
      status: 201,
      body: { ok: true, status: "invited", emailed: true, link },
    });
    expect(given.createInvite).toHaveBeenCalledWith({
      email: "anna@example.invalid",
      firstName: "Anna",
      lastName: "Nowak",
    });
    expect(given.grant).toHaveBeenCalledWith("u-new");
    expect(given.sendInvite).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Anna" }),
      link,
    );
  });

  it("someone's account (e.g. a specialist's): given the access, no e-mail", async () => {
    const given = deps({ findUser: vi.fn().mockResolvedValue("u-1") });
    expect(await inviteAdmin(body, given)).toEqual({
      status: 200,
      body: { ok: true, status: "granted" },
    });
    expect(given.grant).toHaveBeenCalledWith("u-1");
    expect(given.createInvite).not.toHaveBeenCalled();
  });

  it("an admin already: said so", async () => {
    const answer = await inviteAdmin(
      body,
      deps({
        findUser: vi.fn().mockResolvedValue("u-1"),
        hasAdminRole: vi.fn().mockResolvedValue(true),
      }),
    );
    expect(answer.status).toBe(409);
    expect(answer.body).toMatchObject({
      ok: false,
      message: "Ta osoba jest już administratorem.",
    });
  });

  it("the e-mail failed: still invited, the link to pass on", async () => {
    const answer = await inviteAdmin(
      body,
      deps({ sendInvite: vi.fn().mockResolvedValue(false) }),
    );
    expect(answer.body).toMatchObject({ ok: true, emailed: false });
  });

  it("only an admin invites; the form is checked", async () => {
    expect(
      (
        await inviteAdmin(
          body,
          deps({ isAdmin: vi.fn().mockResolvedValue(false) }),
        )
      ).status,
    ).toBe(403);
    const invalid = await inviteAdmin({ email: "x" }, deps());
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      ok: false,
      fields: { email: "Podaj poprawny adres e-mail." },
    });
  });
});
