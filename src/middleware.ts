import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

// JWT verification inline for Edge Runtime compatibility
const getJWTSecret = () => {
  const secret =
    process.env.JWT_SECRET ||
    'development-secret-change-in-production-min-32-chars';
  return new TextEncoder().encode(secret);
};

async function verifyJWT(
  token: string
): Promise<{ role: 'ADMIN' | 'STAFF' } | null> {
  try {
    const secret = getJWTSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return { role: payload.role as 'ADMIN' | 'STAFF' };
  } catch {
    return null;
  }
}

// Routes that require authentication (method-based)
const PROTECTED_ROUTES: Record<string, string[]> = {
  // Products - only write operations require auth
  '/api/products': ['POST', 'PATCH', 'DELETE'],
  // Settings - all writes require auth
  '/api/settings': ['PATCH'],
  // Layout creation requires auth
  '/api/settings/layout': ['POST'],
  // Logs - read requires auth
  '/api/logs': ['GET'],
  // Dev tools - all methods require auth
  '/api/dev': ['GET', 'POST', 'PATCH', 'DELETE'],
  // Extend seat - requires auth (admin operation)
  '/api/seats/extend': ['POST'],
};

// Routes that require ADMIN role specifically (not just STAFF)
const ADMIN_ONLY_ROUTES = [
  '/api/settings',
  '/api/settings/layout',
  '/api/logs',
  '/api/dev',
];

// Public routes that never require auth
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/health',
  '/api/seats',
  '/api/seats/checkin',
  '/api/seats/checkout',
  '/api/lockers',
  '/api/lockers/assign',
  '/api/lockers/release',
  '/api/scan',
  '/api/state',
  '/api/settings/verify-admin', // Legacy, but keep for compatibility
];

// Rate limiting - simple in-memory for Edge
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = { windowMs: 60000, max: 100 };
const AUTH_RATE_LIMIT = { windowMs: 900000, max: 5 }; // 15 min, 5 attempts

function checkRateLimit(
  key: string,
  config: { windowMs: number; max: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + config.windowMs };
    rateLimitMap.set(key, entry);
    return { allowed: true, remaining: config.max - 1 };
  }

  entry.count++;
  if (entry.count > config.max) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: config.max - entry.count };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Skip non-API routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Get client IP for rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Apply stricter rate limit for auth endpoints
  if (pathname === '/api/auth/login') {
    const limit = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
          code: 'RATE_LIMIT',
        },
        {
          status: 429,
          headers: { 'Retry-After': '900' },
        }
      );
    }
  }

  // Apply general rate limit
  const generalLimit = checkRateLimit(`api:${ip}`, RATE_LIMIT);
  if (!generalLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please slow down.',
        code: 'RATE_LIMIT',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        },
      }
    );
  }

  // Check if route is completely public
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if this route/method combination requires auth
  let requiresAuth = false;
  let isAdminOnly = false;

  for (const [route, methods] of Object.entries(PROTECTED_ROUTES)) {
    if (pathname.startsWith(route) && methods.includes(method)) {
      requiresAuth = true;
      if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r))) {
        isAdminOnly = true;
      }
      break;
    }
  }

  // If auth not required, allow through
  if (!requiresAuth) {
    return NextResponse.next();
  }

  // Extract token from cookie or Authorization header
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // Verify token
  const payload = await verifyJWT(token);
  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid or expired token',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  // Check admin-only routes
  if (isAdminOnly && payload.role !== 'ADMIN') {
    return NextResponse.json(
      {
        success: false,
        error: 'Admin access required',
        code: 'FORBIDDEN',
      },
      { status: 403 }
    );
  }

  // Add user info to request headers for downstream use
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
