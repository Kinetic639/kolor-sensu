import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  resolvePortalAccess,
} from "./auth";

describe("resolvePortalAccess", () => {
  it("rejects an unauthenticated visitor", () => {
    expect(
      resolvePortalAccess({
        authenticated: false,
        profileActive: false,
        requiredRole: "admin",
        roles: [],
      }),
    ).toBe("unauthenticated");
  });

  it("rejects a specialist-only user from admin", () => {
    expect(
      resolvePortalAccess({
        authenticated: true,
        profileActive: true,
        requiredRole: "admin",
        roles: ["specialist"],
      }),
    ).toBe("forbidden");
  });

  it("rejects an admin-only user from specialist", () => {
    expect(
      resolvePortalAccess({
        authenticated: true,
        profileActive: true,
        requiredRole: "specialist",
        roles: ["admin"],
      }),
    ).toBe("forbidden");
  });

  it("allows a dual-role user into both portals", () => {
    const roles = ["admin", "specialist"] as const;

    expect(
      resolvePortalAccess({
        authenticated: true,
        profileActive: true,
        requiredRole: "admin",
        roles,
      }),
    ).toBe("allowed");
    expect(
      resolvePortalAccess({
        authenticated: true,
        profileActive: true,
        requiredRole: "specialist",
        roles,
      }),
    ).toBe("allowed");
  });

  it("rejects an inactive profile even when the role matches", () => {
    expect(
      resolvePortalAccess({
        authenticated: true,
        profileActive: false,
        requiredRole: "admin",
        roles: ["admin"],
      }),
    ).toBe("forbidden");
  });
});

describe("auth form schemas", () => {
  it("accepts a valid login", () => {
    expect(
      loginSchema.safeParse({ email: "anna@example.com", password: "secret" })
        .success,
    ).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(forgotPasswordSchema.safeParse({ email: "anna" }).success).toBe(
      false,
    );
  });

  it("requires a strong matching reset password", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password",
        passwordConfirmation: "new-password",
      }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password",
        passwordConfirmation: "different-password",
      }).success,
    ).toBe(false);
  });
});
