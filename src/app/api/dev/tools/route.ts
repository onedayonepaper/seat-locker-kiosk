import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function ensureDev() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not available in production' }, { status: 403 });
  }
  return null;
}

// POST /api/dev/tools - Development helpers
export async function POST(request: NextRequest) {
  const guard = ensureDev();
  if (guard) return guard;

  try {
    const { action } = await request.json();

    if (action === 'createSeatSession') {
      const seat = await db.seat.findFirst({ where: { status: 'AVAILABLE' } });
      const product = await db.product.findFirst({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
      if (!seat || !product) {
        return NextResponse.json({ success: false, error: 'No available seat or product' }, { status: 400 });
      }
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + 10 * 60 * 1000);
      const session = await db.$transaction(async (tx) => {
        const created = await tx.session.create({
          data: {
            resourceType: 'SEAT',
            resourceId: seat.id,
            userTag: '0000',
            productId: product.id,
            startAt,
            endAt,
            status: 'ACTIVE',
          },
        });
        await tx.seat.update({
          where: { id: seat.id },
          data: { status: 'OCCUPIED', currentSessionId: created.id },
        });
        await tx.eventLog.create({
          data: {
            type: 'CHECK_IN',
            payload: JSON.stringify({ seatId: seat.id, sessionId: created.id, dev: true }),
            actorRole: 'ADMIN',
          },
        });
        return created;
      });
      return NextResponse.json({ success: true, data: session });
    }

    if (action === 'createLockerSession') {
      const locker = await db.locker.findFirst({ where: { status: 'AVAILABLE' } });
      if (!locker) {
        return NextResponse.json({ success: false, error: 'No available locker' }, { status: 400 });
      }
      const session = await db.$transaction(async (tx) => {
        const created = await tx.session.create({
          data: {
            resourceType: 'LOCKER',
            resourceId: locker.id,
            userTag: '0000',
            status: 'ACTIVE',
          },
        });
        await tx.locker.update({
          where: { id: locker.id },
          data: { status: 'OCCUPIED', currentSessionId: created.id },
        });
        await tx.eventLog.create({
          data: {
            type: 'ASSIGN',
            payload: JSON.stringify({ lockerId: locker.id, sessionId: created.id, dev: true }),
            actorRole: 'ADMIN',
          },
        });
        return created;
      });
      return NextResponse.json({ success: true, data: session });
    }

    if (action === 'expireAll') {
      const now = new Date();
      await db.session.updateMany({
        where: { status: 'ACTIVE' },
        data: { endAt: new Date(now.getTime() - 60 * 1000) },
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'addLog') {
      const log = await db.eventLog.create({
        data: {
          type: 'CHECK_OUT',
          payload: JSON.stringify({ dev: true, at: new Date().toISOString() }),
          actorRole: 'ADMIN',
        },
      });
      return NextResponse.json({ success: true, data: log });
    }

    if (action === 'clearLogs') {
      await db.eventLog.deleteMany();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Dev tools error:', error);
    return NextResponse.json({ success: false, error: 'Dev tool failed' }, { status: 500 });
  }
}
