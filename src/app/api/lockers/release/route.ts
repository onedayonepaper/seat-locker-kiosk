import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRequest, lockerReleaseSchema } from '@/lib/validation';
import { validateUserTag } from '@/lib/qr-parser';

export const dynamic = 'force-dynamic';

// POST /api/lockers/release - Release a locker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(lockerReleaseSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { lockerId, userTag, force } = validation.data;

    // Check locker exists and has active session
    const locker = await db.locker.findUnique({
      where: { id: lockerId },
      include: { currentSession: true },
    });

    if (!locker) {
      return NextResponse.json(
        { success: false, error: 'Locker not found' },
        { status: 404 }
      );
    }

    if (!locker.currentSession) {
      return NextResponse.json(
        { success: false, error: 'No active assignment for this locker' },
        { status: 409 }
      );
    }

    // Verify user tag (unless force release by admin)
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

      if (locker.currentSession.userTag !== userTag) {
        return NextResponse.json(
          { success: false, error: 'User tag does not match. Please verify your phone number.' },
          { status: 403 }
        );
      }
    }

    const sessionId = locker.currentSession.id;
    const endedReason = force ? 'FORCE_END' : 'RELEASED';
    const actorRole = force ? 'ADMIN' : 'CUSTOMER';

    // End session and update locker in transaction
    await db.$transaction(async (tx) => {
      // Update the session
      await tx.session.update({
        where: { id: sessionId },
        data: {
          status: 'ENDED',
          endedReason,
        },
      });

      // Update the locker
      await tx.locker.update({
        where: { id: lockerId },
        data: {
          status: 'AVAILABLE',
          currentSessionId: null,
          linkedSeatId: null,
        },
      });

      // Log the event
      await tx.eventLog.create({
        data: {
          type: 'RELEASE',
          payload: JSON.stringify({
            lockerId,
            sessionId,
            userTag: locker.currentSession!.userTag,
            endedReason,
            releasedAt: new Date().toISOString(),
          }),
          actorRole,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        lockerId,
        sessionId,
        message: force
          ? `Force released locker ${lockerId}`
          : `Successfully released locker ${lockerId}`,
      },
    });
  } catch (error) {
    console.error('Error releasing locker:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to release locker' },
      { status: 500 }
    );
  }
}
