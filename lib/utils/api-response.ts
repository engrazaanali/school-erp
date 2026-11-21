import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger, LogContext } from "@/lib/logging";

export type HttpStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500;

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    traceId?: string;
  };
}

/**
 * Base Application Error class for controlled operational errors
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: string;
  public readonly details?: ApiErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: HttpStatusCode = 500,
    code: string = "INTERNAL_SERVER_ERROR",
    details?: ApiErrorDetail[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request", details?: ApiErrorDetail[]) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized. Please authenticate.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden. Insufficient permissions.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Requested resource not found.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "A conflict occurred with an existing resource.") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests. Please try again later.") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "An unexpected internal server error occurred.") {
    super(message, 500, "INTERNAL_SERVER_ERROR");
  }
}

/**
 * Creates a standardized JSON success response
 */
export function apiSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

/**
 * Creates a standardized JSON error response
 */
export function apiError(
  message: string,
  statusCode: HttpStatusCode = 500,
  code?: string,
  details?: ApiErrorDetail[],
  traceId?: string
): NextResponse<ApiErrorResponse> {
  const fallbackCode = getErrorCodeFromStatus(statusCode);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: code || fallbackCode,
        message,
        ...(details && details.length > 0 ? { details } : {}),
        ...(traceId ? { traceId } : {}),
      },
    },
    { status: statusCode }
  );
}

function getErrorCodeFromStatus(status: HttpStatusCode): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "TOO_MANY_REQUESTS";
    case 500:
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

/**
 * Detects if an error looks like a Prisma / raw database error
 */
function isPrismaOrDbError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const err = error as { name?: string; code?: string; clientVersion?: string };
  if (err.name?.includes("Prisma") || err.clientVersion !== undefined) return true;
  if (typeof err.code === "string" && err.code.startsWith("P")) return true;
  return false;
}

/**
 * Strips raw database details and produces safe responses
 */
function handleDatabaseError(error: unknown): {
  statusCode: HttpStatusCode;
  code: string;
  message: string;
} {
  const err = error as { code?: string };

  // Common Prisma error codes sanitized
  if (err.code === "P2002") {
    return {
      statusCode: 409,
      code: "CONFLICT",
      message: "A resource with this unique value already exists.",
    };
  }
  if (err.code === "P2025") {
    return {
      statusCode: 404,
      code: "NOT_FOUND",
      message: "The requested record was not found.",
    };
  }
  if (err.code === "P2003") {
    return {
      statusCode: 400,
      code: "BAD_REQUEST",
      message: "The requested operation violates a relational constraint.",
    };
  }

  // Any other database error must NEVER leak table names, fields, or SQL
  return {
    statusCode: 500,
    code: "DATABASE_ERROR",
    message: "A database error occurred. Your request could not be processed.",
  };
}

/**
 * Centralized API error handler for Next.js App Router route handlers
 * Strips raw database / Prisma errors and guarantees consistent response format
 */
export function handleApiError(
  error: unknown,
  context?: LogContext
): NextResponse<ApiErrorResponse> {
  const traceId = crypto.randomUUID();

  // 1. Zod Validation Errors -> 400 Bad Request
  if (error instanceof ZodError) {
    const details: ApiErrorDetail[] = error.errors.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    logger.warn("Validation error encountered", {
      ...context,
      traceId,
      validationErrors: details,
    });

    return apiError("Request validation failed.", 400, "VALIDATION_ERROR", details, traceId);
  }

  // 2. Custom Controlled Application Errors
  if (error instanceof AppError) {
    logger.warn(`Application error [${error.code}]: ${error.message}`, {
      ...context,
      traceId,
      code: error.code,
      statusCode: error.statusCode,
    });

    return apiError(error.message, error.statusCode, error.code, error.details, traceId);
  }

  // 3. Database / Prisma Errors (Strictly sanitized to prevent leakage)
  if (isPrismaOrDbError(error)) {
    // Log full raw error internally for debugging
    logger.error("Raw database error intercepted and sanitized", error, {
      ...context,
      traceId,
    });

    const sanitized = handleDatabaseError(error);
    return apiError(sanitized.message, sanitized.statusCode, sanitized.code, undefined, traceId);
  }

  // 4. Generic / Unknown Server Errors
  logger.error("Unhandled server error encountered", error, {
    ...context,
    traceId,
  });

  return apiError(
    "An unexpected internal server error occurred.",
    500,
    "INTERNAL_SERVER_ERROR",
    undefined,
    traceId
  );
}
