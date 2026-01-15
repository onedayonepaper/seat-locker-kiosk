import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateUserTag } from '@/lib/qr-parser';

export const dynamic = 'force-dynamic';

// POST /api/seats/checkin - Start a seat session
export async function POST(request: NextRequest) {
  try {
    const { seatId, productId, userTag } = await request.json();

    // Validate required fields
    if (!seatId || !productId || !userTag) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: seatId, productId, userTag' },
        { status: 400 }
      );
    }

    // Validate userTag format (4 digits)
    if (!validateUserTag(userTag)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user tag. Please enter 4 digits.' },
        { status: 400 }
      );
    }

    // Check seat exists and is available
    const seat = await db.seat.findUnique({
      where: { id: seatId },
      include: { currentSession: true },
    });

    if (!seat) {
      return NextResponse.json(
        { success: false, error: 'Seat not found' },
        { status: 404 }
      );
    }

    if (seat.status !== 'AVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: `Seat is currently ${seat.status.toLowerCase()}. Please choose another seat.`,
        },
        { status: 409 }
      );
    }

    // Get product for duration calculation
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive product' },
        { status: 400 }
      );
    }

    // Calculate end time
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + product.durationMin * 60 * 1000);

    // Create session and update seat in transaction
    const result = await db.$transaction(async (tx) => {
      // Create the session
      const session = await tx.session.create({
        data: {
          resourceType: 'SEAT',
          resourceId: seatId,
          userTag,
          productId,
          startAt,
          endAt,
          status: 'ACTIVE',
        },
      });

      // Update the seat
      await tx.seat.update({
        where: { id: seatId },
        data: {
          status: 'OCCUPIED',
          currentSessionId: session.id,
        },
      });

      // Log the event
      await tx.eventLog.create({
        data: {
          type: 'CHECK_IN',
          payload: JSON.stringify({
            seatId,
            productId,
            productName: product.name,
            userTag,
            sessionId: session.id,
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
          }),
          actorRole: 'CUSTOMER',
        },
      });

      return session;
    });

    // Fetch the complete session with product info
    const session = await db.session.findUnique({
      where: { id: result.id },
      include: { product: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        session,
        seat: {
          id: seatId,
          status: 'OCCUPIED',
        },
        message: `Successfully checked in to seat ${seatId}`,
      },
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check in' },
      { status: 500 }
    );
  }
}
