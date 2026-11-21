import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/security/password";

describe("Password Security", () => {
  it("hashes password and verifies successfully with timing-safe comparison", async () => {
    const rawPassword = "SuperSecurePassword999!";
    const hash = await hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).toContain(":");
    expect(hash).not.toContain(rawPassword);

    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await verifyPassword("WrongPassword123!", hash);
    expect(isWrong).toBe(false);
  });
});
