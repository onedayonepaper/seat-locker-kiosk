import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/seats - Get all seats with their current sessions
export async function GET() {
  try {
    const seats = await db.seat.findMany({
      include: {
        currentSession: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ row: 'asc' }, { col: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: seats,
    });
  } catch (error) {
    console.error('Error fetching seats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch seats' },
      { status: 500 }
    );
  }
}
