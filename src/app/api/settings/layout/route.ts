import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateLockerId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function getRowLabel(index: number) {
  return String.fromCharCode(65 + index);
}

// POST /api/settings/layout - Apply layout changes (destructive)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rowCount, colCount, lockerCount } = body;

    if (!rowCount || !colCount || rowCount < 1 || colCount < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid seat layout values' },
        { status: 400 }
      );
    }

    if (rowCount > 26) {
      return NextResponse.json(
        { success: false, error: 'Row count cannot exceed 26' },
        { status: 400 }
      );
    }

    if (lockerCount < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid locker count' },
        { status: 400 }
      );
    }

    const seats: { id: string; name: string; row: string; col: number; status: string }[] = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const row = getRowLabel(rowIndex);
      for (let col = 1; col <= colCount; col += 1) {
        const id = `${row}${col}`;
        seats.push({
          id,
          name: `좌석 ${id}`,
          row,
          col,
          status: 'AVAILABLE',
        });
      }
    }

    const lockers: { id: string; name: string; status: string }[] = [];
    for (let i = 1; i <= lockerCount; i += 1) {
      const id = generateLockerId(i);
      lockers.push({
        id,
        name: `락커 ${i}번`,
        status: 'AVAILABLE',
      });
    }

    await db.$transaction(async (tx) => {
      await tx.eventLog.deleteMany();
      await tx.session.deleteMany();
      await tx.seat.deleteMany();
      await tx.locker.deleteMany();

      if (seats.length > 0) {
        await tx.seat.createMany({ data: seats });
      }
      if (lockers.length > 0) {
        await tx.locker.createMany({ data: lockers });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        seatCount: seats.length,
        lockerCount: lockers.length,
      },
    });
  } catch (error) {
    console.error('Error applying layout:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply layout' },
      { status: 500 }
    );
  }
}
