import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/settings/verify-admin - Verify admin passcode
export async function POST(request: NextRequest) {
  try {
    const { passcode } = await request.json();
    if (!passcode) {
      return NextResponse.json(
        { success: false, error: 'Passcode is required' },
        { status: 400 }
      );
    }

    const stored = await db.appConfig.findUnique({ where: { key: 'adminPasscode' } });
    const expected = stored?.value ?? '1234';

    return NextResponse.json({
      success: true,
      data: {
        valid: passcode === expected,
      },
    });
  } catch (error) {
    console.error('Error verifying admin passcode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify passcode' },
      { status: 500 }
    );
  }
}
