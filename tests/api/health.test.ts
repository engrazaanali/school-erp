import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";
import { NextRequest } from "next/server";

describe("Health Check API (/api/health)", () => {
  it("returns 200 OK with operational health payload", async () => {
    const request = new NextRequest("http://localhost:3000/api/health");
    const response = await GET(request);

    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("ok");
    expect(json.data.version).toBe("0.1.0");
    expect(json.data.services).toBeDefined();
    expect(json.data.timestamp).toBeDefined();
  });
});
