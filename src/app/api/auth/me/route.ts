import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT, AUTH_COOKIE_NAME } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// GET /api/auth/me - Get current user info
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token =
      request.cookies.get(AUTH_COOKIE_NAME)?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: false,
          role: null,
        },
      });
    }

    // Verify token
    const payload = await verifyJWT(token);

    if (!payload) {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: false,
          role: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: true,
        role: payload.role,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get user info',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
