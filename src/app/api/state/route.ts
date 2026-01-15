import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/state - Get full application state for polling
export async function GET() {
  try {
    const expirationHandling = (
      await db.appConfig.findUnique({ where: { key: 'expirationHandling' } })
    )?.value || 'MANUAL';
    const [seats, lockers, products, sessions] = await Promise.all([
      db.seat.findMany({
        include: {
          currentSession: {
            include: {
              product: true,
            },
          },
        },
        orderBy: [{ row: 'asc' }, { col: 'asc' }],
      }),
      db.locker.findMany({
        include: {
          currentSession: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
      db.product.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      db.session.findMany({
        where: { status: 'ACTIVE' },
        include: { product: true },
        orderBy: { startAt: 'desc' },
      }),
    ]);

    // Check for expired sessions and update their status
    const now = new Date();
    const expiredSessions = sessions.filter(
      (s) => s.endAt && new Date(s.endAt) < now && s.status === 'ACTIVE'
    );

    // Update expired sessions and their resources
    for (const session of expiredSessions) {
      if (expirationHandling === 'AUTO') {
        await db.$transaction([
          db.session.update({
            where: { id: session.id },
            data: { status: 'ENDED', endedReason: 'EXPIRED' },
          }),
          ...(session.resourceType === 'SEAT'
            ? [
                db.seat.update({
                  where: { id: session.resourceId },
                  data: { status: 'AVAILABLE', currentSessionId: null },
                }),
              ]
            : [
                db.locker.update({
                  where: { id: session.resourceId },
                  data: { status: 'AVAILABLE', currentSessionId: null, linkedSeatId: null },
                }),
              ]),
          db.eventLog.create({
            data: {
              type: 'FORCE_END',
              payload: JSON.stringify({
                resourceType: session.resourceType,
                resourceId: session.resourceId,
                sessionId: session.id,
                endedReason: 'EXPIRED',
              }),
              actorRole: 'ADMIN',
            },
          }),
        ]);
      } else {
        await db.$transaction([
          db.session.update({
            where: { id: session.id },
            data: { status: 'EXPIRED' },
          }),
          ...(session.resourceType === 'SEAT'
            ? [
                db.seat.update({
                  where: { id: session.resourceId },
                  data: { status: 'EXPIRED' },
                }),
              ]
            : []),
        ]);
      }
    }

    // If there were expired sessions, refetch the data
    if (expiredSessions.length > 0) {
      const [updatedSeats, updatedLockers, updatedSessions] = await Promise.all([
        db.seat.findMany({
          include: {
            currentSession: {
              include: { product: true },
            },
          },
          orderBy: [{ row: 'asc' }, { col: 'asc' }],
        }),
        db.locker.findMany({
          include: {
            currentSession: {
              include: { product: true },
            },
          },
          orderBy: { id: 'asc' },
        }),
        db.session.findMany({
          where: { status: 'ACTIVE' },
          include: { product: true },
          orderBy: { startAt: 'desc' },
        }),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          seats: updatedSeats,
          lockers: updatedLockers,
          products,
          sessions: updatedSessions,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        seats,
        lockers,
        products,
        sessions,
      },
    });
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch state' },
      { status: 500 }
    );
  }
}
