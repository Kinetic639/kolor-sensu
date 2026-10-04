import { describe, expect, it, vi } from "vitest";
import {
  AccessError,
  grantAdmin,
  listPortalUsers,
  portalUserIdByEmail,
  revokeAdmin,
} from "./access";

describe("listPortalUsers", () => {
  it("every portal user with their roles", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          user_id: "u-1",
          email: "anna@example.invalid",
          first_name: "Anna",
          last_name: "Nowak",
          is_admin: true,
          is_specialist: false,
          signed_in_at: null,
          invited_at: "2026-10-05T08:00:00Z",
          joined: false,
        },
      ],
      error: null,
    });
    await expect(listPortalUsers({ rpc } as never)).resolves.toEqual([
      {
        id: "u-1",
        email: "anna@example.invalid",
        firstName: "Anna",
        lastName: "Nowak",
        isAdmin: true,
        isSpecialist: false,
        signedInAt: null,
        invitedAt: "2026-10-05T08:00:00Z",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("list_portal_users");
  });
});

describe("grantAdmin and revokeAdmin", () => {
  it("ask the database, which checks who asks", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    await grantAdmin({ rpc } as never, "u-1");
    await revokeAdmin({ rpc } as never, "u-2");
    expect(rpc).toHaveBeenNthCalledWith(1, "grant_admin", { p_user: "u-1" });
    expect(rpc).toHaveBeenNthCalledWith(2, "revoke_admin", { p_user: "u-2" });
  });

  it("a refusal comes with its code", async () => {
    const rpc = vi.fn().mockResolvedValue({
      error: { message: "The centre needs an admin.", hint: "last_admin" },
    });
    const refused = revokeAdmin({ rpc } as never, "u-2");
    await expect(refused).rejects.toBeInstanceOf(AccessError);
    await expect(refused).rejects.toMatchObject({ code: "last_admin" });
  });
});

describe("portalUserIdByEmail", () => {
  it("the account with the address, or none", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    await expect(
      portalUserIdByEmail({ rpc } as never, "anna@example.invalid"),
    ).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("portal_user_id_by_email", {
      p_email: "anna@example.invalid",
    });
  });
});
