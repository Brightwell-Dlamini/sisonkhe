/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed application errors with stable machine codes.
 *
 * Contract:
 * - Domain and auth code throw AppError (or subclasses).
 * - Route handlers never string-match error.message for HTTP status.
 * - Clients may rely on `code` remaining stable across releases.
 */

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "REGION_REQUIRED"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVARIANT"
  | "INTERNAL";

const HTTP_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  REGION_REQUIRED: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVARIANT: 422,
  INTERNAL: 500,
};

const DEFAULT_MESSAGE: Record<ErrorCode, string> = {
  UNAUTHENTICATED: "Authentication required",
  FORBIDDEN: "You do not have permission for this action",
  REGION_REQUIRED: "Rank admin must have a region assigned on their staff profile",
  NOT_FOUND: "Resource not found",
  VALIDATION: "Request validation failed",
  CONFLICT: "Resource conflict",
  RATE_LIMITED: "Too many requests",
  INVARIANT: "Business invariant violated",
  INTERNAL: "Internal server error",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: Record<string, unknown>;
  readonly expose: boolean;

  constructor(
    code: ErrorCode,
    message?: string,
    opts?: {
      details?: Record<string, unknown>;
      /** When false, clients only receive the stable code (not internal detail). */
      expose?: boolean;
      cause?: unknown;
    }
  ) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = HTTP_BY_CODE[code];
    this.details = opts?.details;
    this.expose = opts?.expose ?? code !== "INTERNAL";
    if (opts?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }

  static unauthenticated(message?: string): AppError {
    return new AppError("UNAUTHENTICATED", message);
  }

  static forbidden(message?: string): AppError {
    return new AppError("FORBIDDEN", message);
  }

  static regionRequired(message?: string): AppError {
    return new AppError("REGION_REQUIRED", message);
  }

  static notFound(resource = "Resource"): AppError {
    return new AppError("NOT_FOUND", `${resource} not found`);
  }

  static validation(message: string, details?: Record<string, unknown>): AppError {
    return new AppError("VALIDATION", message, { details });
  }

  static conflict(message: string): AppError {
    return new AppError("CONFLICT", message);
  }

  static internal(message?: string, cause?: unknown): AppError {
    return new AppError("INTERNAL", message, { expose: false, cause });
  }

  /** Map legacy string throws and unknown errors into AppError. */
  static fromUnknown(err: unknown): AppError {
    if (err instanceof AppError) return err;

    if (err instanceof Error) {
      const msg = err.message;
      if (msg === "UNAUTHENTICATED") return AppError.unauthenticated();
      if (msg === "FORBIDDEN") return AppError.forbidden();
      if (msg === "REGION_REQUIRED") return AppError.regionRequired();
      if (msg === "NOT_FOUND") return AppError.notFound();
      // Known domain gate strings from eligibility / permissions
      if (msg.startsWith("Illegal transition")) {
        return new AppError("INVARIANT", msg);
      }
      return AppError.internal(msg, err);
    }

    return AppError.internal("Unknown error", err);
  }

  toJSON(): {
    error: string;
    code: ErrorCode;
    details?: Record<string, unknown>;
  } {
    return {
      error: this.expose ? this.message : DEFAULT_MESSAGE.INTERNAL,
      code: this.code,
      ...(this.details && this.expose ? { details: this.details } : {}),
    };
  }
}
