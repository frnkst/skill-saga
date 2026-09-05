import { describe, expect, it } from "vitest";
import { constantTimeEqual, signSession, verifySession } from "./session";

const secret = "a".repeat(32);

describe("signed sessions", () => {
  it("round trips and rejects tampering and expiry", () => {
    const value = { kind: "guardian" as const, subject: "household", expiresAt: 2_000 };
    const token = signSession(value, secret);
    expect(verifySession(token, secret, 1_000)).toEqual(value);
    expect(verifySession(`${token}x`, secret, 1_000)).toBeNull();
    expect(verifySession(token, secret, 2_000)).toBeNull();
  });

  it("compares passwords without direct string equality", () => {
    expect(constantTimeEqual("correct", "correct")).toBe(true);
    expect(constantTimeEqual("correct", "wrong")).toBe(false);
  });
});
