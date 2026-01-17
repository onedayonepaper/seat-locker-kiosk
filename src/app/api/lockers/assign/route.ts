import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRequest, lockerAssignSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// POST /api/lockers/assign - Assign a locker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(lockerAssignSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { lockerId, userTag, linkedSeatSessionId } = validation.data;

    // Check locker exists and is available
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

    if (locker.status !== 'AVAILABLE') {
      return NextResponse.json(
        {
          success: false,
          error: `Locker is currently ${locker.status.toLowerCase()}. Please choose another locker.`,
        },
        { status: 409 }
      );
    }

    // If linked to a seat session, verify it exists
    let linkedSeatId = null;
    if (linkedSeatSessionId) {
      const seatSession = await db.session.findUnique({
        where: { id: linkedSeatSessionId },
      });

      if (!seatSession || seatSession.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Invalid or inactive seat session for linking' },
          { status: 400 }
        );
      }

      linkedSeatId = seatSession.resourceId;
    }

    // Create session and update locker in transaction
    const result = await db.$transaction(async (tx) => {
      // Create the session (lockers don't have time limits by default)
      const session = await tx.session.create({
        data: {
          resourceType: 'LOCKER',
          resourceId: lockerId,
          userTag,
          status: 'ACTIVE',
          // No endAt for lockers - they're released manually
        },
      });

      // Update the locker
      await tx.locker.update({
        where: { id: lockerId },
        data: {
          status: 'OCCUPIED',
          currentSessionId: session.id,
          linkedSeatId,
        },
      });

      // Log the event
      await tx.eventLog.create({
        data: {
          type: 'ASSIGN',
          payload: JSON.stringify({
            lockerId,
            userTag,
            sessionId: session.id,
            linkedSeatId,
            linkedSeatSessionId,
            assignedAt: new Date().toISOString(),
          }),
          actorRole: 'CUSTOMER',
        },
      });

      return session;
    });

    return NextResponse.json({
      success: true,
      data: {
        session: result,
        locker: {
          id: lockerId,
          status: 'OCCUPIED',
          linkedSeatId,
        },
        message: `Successfully assigned locker ${lockerId}`,
      },
    });
  } catch (error) {
    console.error('Error assigning locker:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign locker' },
      { status: 500 }
    );
  }
}
