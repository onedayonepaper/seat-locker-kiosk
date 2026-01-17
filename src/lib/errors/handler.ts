import { NextResponse } from 'next/server';
import { ZodError, ZodIssue } from 'zod';
import { AppError } from './index';

/**
 * Centralized error handler for API routes
 * Converts errors to consistent JSON responses
 */
export function handleApiError(error: unknown): NextResponse {
  // Log error for debugging (don't expose in production)
  console.error('API Error:', error);

  // Handle custom application errors
  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: error.statusCode });
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const message = error.issues
      .map((e: ZodIssue) => {
        const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
        return `${path}${e.message}`;
      })
      .join('; ');

    return NextResponse.json(
      {
        success: false,
        error: `Validation failed: ${message}`,
        code: 'VALIDATION_ERROR',
        details: error.issues.map((e: ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; message?: string };

    // Unique constraint violation
    if (prismaError.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'A resource with this identifier already exists',
          code: 'CONFLICT',
        },
        { status: 409 }
      );
    }

    // Record not found
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        {
          success: false,
          error: 'Resource not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Foreign key constraint failed
    if (prismaError.code === 'P2003') {
      return NextResponse.json(
        {
          success: false,
          error: 'Related resource not found',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      );
    }
  }

  // Handle standard errors
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'An unexpected error occurred';

    return NextResponse.json(
      {
        success: false,
        error: message,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  // Fallback for unknown errors
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrap an async API handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  return handler().catch(handleApiError);
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
