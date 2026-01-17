/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
    };
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error - e.g., resource already in use (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Validation error - invalid input data (400)
 */
export class ValidationError extends AppError {
  public details?: Array<{ field: string; message: string }>;

  constructor(message: string, details?: Array<{ field: string; message: string }>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.details = details;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Unauthorized error - authentication required (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error - insufficient permissions (403)
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  public retryAfterMs: number;

  constructor(retryAfterMs: number, message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Concurrency error - optimistic lock failure
 */
export class ConcurrencyError extends ConflictError {
  constructor(message = 'Resource was modified by another transaction') {
    super(message);
    this.name = 'ConcurrencyError';
    this.code = 'CONCURRENCY_ERROR';
  }
}
