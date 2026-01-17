import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

// POST /api/auth/logout - Logout and clear auth cookie
export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      data: {
        message: 'Logout successful',
      },
    });

    // Clear auth cookie by setting it with an expired date
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Logout failed',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
