export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  organizationId?: string | null;
  campusId?: string | null;
  userId?: string | null;
  requestId?: string | null;
  action?: string;
  resource?: string;
  ip?: string | null;
  userAgent?: string | null;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name?: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authsecret",
  "authorization",
  "cookie",
  "creditcard",
  "cardnumber",
  "cvv",
  "ssn",
  "apikey",
]);

/**
 * Recursively redacts sensitive keys from metadata objects
 */
export function sanitizeLogData(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return String(data);
}

class StructuredLogger {
  private defaultContext: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.defaultContext = defaultContext;
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: unknown): void {
    const mergedContext = {
      ...this.defaultContext,
      ...(context || {}),
    };

    const sanitizedContext = sanitizeLogData(mergedContext) as LogContext;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(Object.keys(sanitizedContext).length > 0 ? { context: sanitizedContext } : {}),
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
      };
    } else if (error) {
      entry.error = {
        message: String(error),
      };
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        if (process.env.NODE_ENV !== "production") {
          console.debug(output);
        }
        break;
      case "info":
      default:
        console.log(output);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.write("warn", message, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.write("error", message, context, error);
  }

  child(context: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.defaultContext,
      ...context,
    });
  }
}

export const logger = new StructuredLogger();
export { StructuredLogger };
