import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiSuccess, handleApiError } from "@/lib/utils/api-response";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  try {
    // Basic database connectivity check with timeout
    let dbStatus: "connected" | "disconnected" = "disconnected";
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("DB ping timeout")), 2000)
        ),
      ]);
      dbStatus = "connected";
    } catch (dbErr) {
      logger.warn("Health check: Database ping failed or timed out", {
        requestId,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      dbStatus = "disconnected";
    }

    const healthData = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: "0.1.0",
      services: {
        database: dbStatus,
      },
      responseTimeMs: Date.now() - startTime,
    };

    logger.info("Health check endpoint invoked", {
      requestId,
      dbStatus,
      responseTimeMs: healthData.responseTimeMs,
    });

    return apiSuccess(healthData, undefined, 200);
  } catch (error) {
    return handleApiError(error, {
      requestId,
      endpoint: "/api/health",
    });
  }
}
