import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signJWT, AUTH_COOKIE_NAME, AUTH_COOKIE_OPTIONS } from '@/lib/auth/jwt';
import { validateRequest, loginSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// POST /api/auth/login - Login with passcode
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = validateRequest(loginSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { passcode } = validation.data;

    // Get stored passcode
    const stored = await db.appConfig.findUnique({
      where: { key: 'adminPasscode' },
    });

    // Default passcode is '1234' - should be changed in production
    const expectedPasscode = stored?.value ?? '1234';

    if (passcode !== expectedPasscode) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid passcode',
          code: 'INVALID_CREDENTIALS',
        },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await signJWT({ role: 'ADMIN' });

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      data: {
        role: 'ADMIN',
        message: 'Login successful',
      },
    });

    // Set auth cookie
    response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Login failed',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
