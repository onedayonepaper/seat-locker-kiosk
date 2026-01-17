import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { handleApiError } from '@/lib/errors/handler';
import { checkRateLimit, getClientIP, createRateLimitHeaders, RateLimitConfig, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

interface HandlerOptions<T> {
  /** Zod schema for request body validation */
  schema?: ZodSchema<T>;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig | keyof typeof RATE_LIMIT_CONFIGS;
  /** Whether this endpoint requires authentication (handled by middleware) */
  requireAuth?: boolean;
  /** Whether this endpoint requires admin role (handled by middleware) */
  requireAdmin?: boolean;
}

interface HandlerContext<TInput> {
  /** Validated request body data */
  data: TInput;
  /** Original request object */
  request: NextRequest;
  /** User role from middleware (if authenticated) */
  userRole?: 'ADMIN' | 'STAFF';
  /** URL search params */
  searchParams: URLSearchParams;
}

/**
 * Create a standardized API handler with built-in:
 * - Request body validation
 * - Rate limiting
 * - Error handling
 * - Consistent response format
 *
 * @example
 * export const POST = createHandler(
 *   { schema: checkInSchema, rateLimit: 'checkin' },
 *   async ({ data, userRole }) => {
 *     const result = await checkInWithLock(data.seatId, data.productId, data.userTag);
 *     return result;
 *   }
 * );
 */
export function createHandler<TInput = unknown, TOutput = unknown>(
  options: HandlerOptions<TInput>,
  handler: (context: HandlerContext<TInput>) => Promise<TOutput>
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const config =
          typeof options.rateLimit === 'string'
            ? RATE_LIMIT_CONFIGS[options.rateLimit]
            : options.rateLimit;

        const ip = getClientIP(request);
        const limitKey = `api:${request.nextUrl.pathname}:${ip}`;
        const result = checkRateLimit(limitKey, config);

        if (!result.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: 'Too many requests. Please try again later.',
              code: 'RATE_LIMIT',
            },
            {
              status: 429,
              headers: createRateLimitHeaders(result),
            }
          );
        }
      }

      // Get user role from middleware header
      const userRole = request.headers.get('x-user-role') as 'ADMIN' | 'STAFF' | null;

      // Parse and validate request body
      let data: TInput;
      if (options.schema) {
        const body = await request.json();
        data = options.schema.parse(body);
      } else {
        data = {} as TInput;
      }

      // Get search params
      const searchParams = request.nextUrl.searchParams;

      // Execute the handler
      const result = await handler({
        data,
        request,
        userRole: userRole || undefined,
        searchParams,
      });

      // Return success response
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Create a GET handler (no body parsing)
 */
export function createGetHandler<TOutput = unknown>(
  options: Omit<HandlerOptions<never>, 'schema'>,
  handler: (context: Omit<HandlerContext<never>, 'data'>) => Promise<TOutput>
) {
  return async function (request: NextRequest): Promise<NextResponse> {
    try {
      // Apply rate limiting
      if (options.rateLimit) {
        const config =
          typeof options.rateLimit === 'string'
            ? RATE_LIMIT_CONFIGS[options.rateLimit]
            : options.rateLimit;

        const ip = getClientIP(request);
        const limitKey = `api:${request.nextUrl.pathname}:${ip}`;
        const result = checkRateLimit(limitKey, config);

        if (!result.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: 'Too many requests. Please try again later.',
              code: 'RATE_LIMIT',
            },
            {
              status: 429,
              headers: createRateLimitHeaders(result),
            }
          );
        }
      }

      // Get user role from middleware header
      const userRole = request.headers.get('x-user-role') as 'ADMIN' | 'STAFF' | null;

      // Get search params
      const searchParams = request.nextUrl.searchParams;

      // Execute the handler
      const result = await handler({
        request,
        userRole: userRole || undefined,
        searchParams,
      });

      // Return success response
      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
