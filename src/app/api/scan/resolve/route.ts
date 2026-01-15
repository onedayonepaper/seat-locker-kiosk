import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { parseQRCode } from '@/lib/qr-parser';

export const dynamic = 'force-dynamic';

// POST /api/scan/resolve - Decode QR code and return resource info
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Code is required' },
        { status: 400 }
      );
    }

    const result = parseQRCode(code);

    if (result.type === 'UNKNOWN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid QR code format. Expected SEAT:XX or LOCKER:XXX',
        },
        { status: 400 }
      );
    }

    let resource = null;

    if (result.type === 'SEAT') {
      resource = await db.seat.findUnique({
        where: { id: result.resourceId! },
        include: {
          currentSession: {
            include: {
              product: true,
            },
          },
        },
      });
    } else if (result.type === 'LOCKER') {
      resource = await db.locker.findUnique({
        where: { id: result.resourceId! },
        include: {
          currentSession: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    if (!resource) {
      return NextResponse.json(
        { success: false, error: `${result.type} ${result.resourceId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        type: result.type,
        resourceId: result.resourceId,
        resource,
        hasActiveSession: resource.currentSession !== null,
      },
    });
  } catch (error) {
    console.error('Error resolving scan:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve scan' },
      { status: 500 }
    );
  }
}
