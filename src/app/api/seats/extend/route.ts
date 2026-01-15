import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST /api/seats/extend - Extend a seat session
export async function POST(request: NextRequest) {
  try {
    const { seatId, addMinutes, productId } = await request.json();

    // Validate required fields
    if (!seatId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: seatId' },
        { status: 400 }
      );
    }

    if (!addMinutes && !productId) {
      return NextResponse.json(
        { success: false, error: 'Must specify addMinutes or productId' },
        { status: 400 }
      );
    }

    // Check seat exists and has active session
    const seat = await db.seat.findUnique({
      where: { id: seatId },
      include: {
        currentSession: {
          include: { product: true },
        },
      },
    });

    if (!seat) {
      return NextResponse.json(
        { success: false, error: 'Seat not found' },
        { status: 404 }
      );
    }

    if (!seat.currentSession) {
      return NextResponse.json(
        { success: false, error: 'No active session for this seat' },
        { status: 409 }
      );
    }

    let minutesToAdd = addMinutes;
    let productName = null;

    // If productId is specified, get duration from product
    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
      });

      if (!product || !product.isActive) {
        return NextResponse.json(
          { success: false, error: 'Invalid or inactive product' },
          { status: 400 }
        );
      }

      minutesToAdd = product.durationMin;
      productName = product.name;
    }

    // Calculate new end time
    const currentEndAt = seat.currentSession.endAt || new Date();
    const newEndAt = new Date(
      new Date(currentEndAt).getTime() + minutesToAdd * 60 * 1000
    );

    // Update session in transaction
    await db.$transaction(async (tx) => {
      // Update the session
      await tx.session.update({
        where: { id: seat.currentSession!.id },
        data: {
          endAt: newEndAt,
        },
      });

      // If seat was expired, restore to occupied
      if (seat.status === 'EXPIRED') {
        await tx.seat.update({
          where: { id: seatId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Log the event
      await tx.eventLog.create({
        data: {
          type: 'EXTEND',
          payload: JSON.stringify({
            seatId,
            sessionId: seat.currentSession!.id,
            userTag: seat.currentSession!.userTag,
            addMinutes: minutesToAdd,
            productId,
            productName,
            previousEndAt: currentEndAt,
            newEndAt: newEndAt.toISOString(),
          }),
          actorRole: 'ADMIN',
        },
      });
    });

    // Fetch updated session
    const updatedSession = await db.session.findUnique({
      where: { id: seat.currentSession.id },
      include: { product: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        session: updatedSession,
        addedMinutes: minutesToAdd,
        newEndAt,
        message: `Extended seat ${seatId} by ${minutesToAdd} minutes`,
      },
    });
  } catch (error) {
    console.error('Error extending session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extend session' },
      { status: 500 }
    );
  }
}
