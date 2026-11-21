import { describe, it, expect, vi } from "vitest";
import { sanitizeLogData, StructuredLogger } from "@/lib/logging";

describe("Structured Logger", () => {
  it("should redact sensitive fields recursively", () => {
    const rawData = {
      username: "teacher_john",
      password: "SuperSecretPassword123!",
      apiKey: "xyz-987-secret-key",
      nested: {
        authorization: "Bearer eyJhbGciOi...",
        token: "session-token-abc",
        safeNote: "Regular student comment",
      },
      tags: ["active", "verified"],
    };

    const sanitized = sanitizeLogData(rawData) as Record<string, unknown>;

    expect(sanitized.username).toBe("teacher_john");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.apiKey).toBe("[REDACTED]");

    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.authorization).toBe("[REDACTED]");
    expect(nested.token).toBe("[REDACTED]");
    expect(nested.safeNote).toBe("Regular student comment");
  });

  it("should output valid JSON log entries with metadata", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const customLogger = new StructuredLogger({ organizationId: "org-123" });

    customLogger.info("Operation performed", { userId: "user-456", action: "LOGIN" });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const loggedOutput = consoleSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(loggedOutput);

    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Operation performed");
    expect(parsed.context.organizationId).toBe("org-123");
    expect(parsed.context.userId).toBe("user-456");
    expect(parsed.timestamp).toBeDefined();

    consoleSpy.mockRestore();
  });
});
