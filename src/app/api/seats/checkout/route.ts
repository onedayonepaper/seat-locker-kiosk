import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateUserTag } from '@/lib/qr-parser';

export const dynamic = 'force-dynamic';

// POST /api/seats/checkout - End a seat session
export async function POST(request: NextRequest) {
  try {
    const { seatId, userTag, force } = await request.json();

    // Validate required fields
    if (!seatId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: seatId' },
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

    // Verify user tag (unless force checkout by admin)
    if (!force) {
      if (!userTag) {
        return NextResponse.json(
          { success: false, error: 'Please enter your phone number (last 4 digits)' },
          { status: 400 }
        );
      }

      if (!validateUserTag(userTag)) {
        return NextResponse.json(
          { success: false, error: 'Invalid user tag. Please enter 4 digits.' },
          { status: 400 }
        );
      }

      if (seat.currentSession.userTag !== userTag) {
        return NextResponse.json(
          { success: false, error: 'User tag does not match. Please verify your phone number.' },
          { status: 403 }
        );
      }
    }

    const sessionId = seat.currentSession.id;
    const endedReason = force ? 'FORCE_END' : 'CHECKOUT';
    const actorRole = force ? 'ADMIN' : 'CUSTOMER';

    // End session and update seat in transaction
    await db.$transaction(async (tx) => {
      // Update the session
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ENDED',
          endedReason,
        },
      });

      // Update the seat
      await tx.seat.update({
        where: { id: seatId },
        data: {
          status: 'AVAILABLE',
          currentSessionId: null,
        },
      });

      // Log the event
      await tx.eventLog.create({
        data: {
          type: force ? 'FORCE_END' : 'CHECK_OUT',
          payload: JSON.stringify({
            seatId,
            sessionId,
            userTag: seat.currentSession!.userTag,
            endedReason,
            endedAt: new Date().toISOString(),
          }),
          actorRole,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        seatId,
        sessionId,
        message: force
          ? `Force ended session for seat ${seatId}`
          : `Successfully checked out from seat ${seatId}`,
      },
    });
  } catch (error) {
    console.error('Error during check-out:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check out' },
      { status: 500 }
    );
  }
}
