import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/lockers - Get all lockers with their current sessions
export async function GET() {
  try {
    const lockers = await db.locker.findMany({
      include: {
        currentSession: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: lockers,
    });
  } catch (error) {
    console.error('Error fetching lockers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lockers' },
      { status: 500 }
    );
  }
}
