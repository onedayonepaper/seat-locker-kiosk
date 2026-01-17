import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { NextResponse } from 'next/server';

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  response: NextResponse;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate request data against a Zod schema
 * Returns parsed data on success, or a NextResponse with error details on failure
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues
        .map((e: ZodIssue) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
          return `${path}${e.message}`;
        })
        .join('; ');

      return {
        success: false,
        response: NextResponse.json(
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
        ),
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate URL search params against a Zod schema
 */
export function validateSearchParams<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  // Convert search params to object
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validateRequest(schema, params);
}

/**
 * Type guard for checking validation success
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.success;
}

// Re-export all schemas for convenience
export * from './schemas';
