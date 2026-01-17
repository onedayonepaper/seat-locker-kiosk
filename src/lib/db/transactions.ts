import { db } from '@/lib/db';
import { ConflictError, NotFoundError } from '@/lib/errors';

/**
 * Check in to a seat with optimistic locking to prevent race conditions
 * Uses version field to detect concurrent modifications
 */
export async function checkInWithLock(
  seatId: string,
  productId: string,
  userTag: string,
  maxRetries = 3
): Promise<{ session: Awaited<ReturnType<typeof db.session.create>>; seat: { id: string; status: string } }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // Get the seat with current version
        const seat = await tx.seat.findUnique({
          where: { id: seatId },
          include: { currentSession: true },
        });

        if (!seat) {
          throw new NotFoundError('Seat');
        }

        if (seat.status !== 'AVAILABLE') {
          throw new ConflictError(`Seat is currently ${seat.status.toLowerCase()}`);
        }

        // Get product
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product || !product.isActive) {
          throw new NotFoundError('Product');
        }

        const startAt = new Date();
        const endAt = new Date(startAt.getTime() + product.durationMin * 60 * 1000);

        // Create session
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

        // Update seat with optimistic lock check
        const updated = await tx.seat.updateMany({
          where: {
            id: seatId,
            version: seat.version, // Optimistic lock
            status: 'AVAILABLE', // Double-check status
          },
          data: {
            status: 'OCCUPIED',
            currentSessionId: session.id,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new ConflictError('Seat was modified by another transaction');
        }

        // Log event
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

        return { session, seat: { id: seatId, status: 'OCCUPIED' } };
      });
    } catch (error) {
      // Only retry on conflict errors
      if (error instanceof ConflictError && attempt < maxRetries - 1) {
        // Wait with exponential backoff before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError('Failed to check in after multiple attempts');
}

/**
 * Assign a locker with optimistic locking
 */
export async function assignLockerWithLock(
  lockerId: string,
  userTag: string,
  linkedSeatSessionId?: string,
  maxRetries = 3
): Promise<{ session: Awaited<ReturnType<typeof db.session.create>>; locker: { id: string; status: string; linkedSeatId: string | null } }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // Get the locker with current version
        const locker = await tx.locker.findUnique({
          where: { id: lockerId },
          include: { currentSession: true },
        });

        if (!locker) {
          throw new NotFoundError('Locker');
        }

        if (locker.status !== 'AVAILABLE') {
          throw new ConflictError(`Locker is currently ${locker.status.toLowerCase()}`);
        }

        // If linked to a seat session, verify it exists
        let linkedSeatId: string | null = null;
        if (linkedSeatSessionId) {
          const seatSession = await tx.session.findUnique({
            where: { id: linkedSeatSessionId },
          });

          if (!seatSession || seatSession.status !== 'ACTIVE') {
            throw new NotFoundError('Linked seat session');
          }

          linkedSeatId = seatSession.resourceId;
        }

        // Create session
        const session = await tx.session.create({
          data: {
            resourceType: 'LOCKER',
            resourceId: lockerId,
            userTag,
            status: 'ACTIVE',
          },
        });

        // Update locker with optimistic lock check
        const updated = await tx.locker.updateMany({
          where: {
            id: lockerId,
            version: locker.version, // Optimistic lock
            status: 'AVAILABLE', // Double-check status
          },
          data: {
            status: 'OCCUPIED',
            currentSessionId: session.id,
            linkedSeatId,
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new ConflictError('Locker was modified by another transaction');
        }

        // Log event
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

        return { session, locker: { id: lockerId, status: 'OCCUPIED', linkedSeatId } };
      });
    } catch (error) {
      // Only retry on conflict errors
      if (error instanceof ConflictError && attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError('Failed to assign locker after multiple attempts');
}

/**
 * Check out from a seat with optimistic locking
 */
export async function checkOutWithLock(
  seatId: string,
  userTag: string | undefined,
  force: boolean
): Promise<{ seatId: string; sessionId: string }> {
  return await db.$transaction(async (tx) => {
    const seat = await tx.seat.findUnique({
      where: { id: seatId },
      include: { currentSession: true },
    });

    if (!seat) {
      throw new NotFoundError('Seat');
    }

    if (!seat.currentSession) {
      throw new ConflictError('No active session for this seat');
    }

    // Verify user tag (unless force checkout by admin)
    if (!force && seat.currentSession.userTag !== userTag) {
      throw new ConflictError('User tag does not match');
    }

    const sessionId = seat.currentSession.id;
    const endedReason = force ? 'FORCE_END' : 'CHECKOUT';
    const actorRole = force ? 'ADMIN' : 'CUSTOMER';

    // Update session
    await tx.session.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedReason,
      },
    });

    // Update seat with version increment
    await tx.seat.update({
      where: { id: seatId },
      data: {
        status: 'AVAILABLE',
        currentSessionId: null,
        version: { increment: 1 },
      },
    });

    // Log event
    await tx.eventLog.create({
      data: {
        type: force ? 'FORCE_END' : 'CHECK_OUT',
        payload: JSON.stringify({
          seatId,
          sessionId,
          userTag: seat.currentSession.userTag,
          endedReason,
          endedAt: new Date().toISOString(),
        }),
        actorRole,
      },
    });

    return { seatId, sessionId };
  });
}

/**
 * Release a locker with optimistic locking
 */
export async function releaseLockerWithLock(
  lockerId: string,
  userTag: string | undefined,
  force: boolean
): Promise<{ lockerId: string; sessionId: string }> {
  return await db.$transaction(async (tx) => {
    const locker = await tx.locker.findUnique({
      where: { id: lockerId },
      include: { currentSession: true },
    });

    if (!locker) {
      throw new NotFoundError('Locker');
    }

    if (!locker.currentSession) {
      throw new ConflictError('No active assignment for this locker');
    }

    // Verify user tag (unless force release by admin)
    if (!force && locker.currentSession.userTag !== userTag) {
      throw new ConflictError('User tag does not match');
    }

    const sessionId = locker.currentSession.id;
    const endedReason = force ? 'FORCE_END' : 'RELEASED';
    const actorRole = force ? 'ADMIN' : 'CUSTOMER';

    // Update session
    await tx.session.update({
      where: { id: sessionId },
      data: {
        status: 'ENDED',
        endedReason,
      },
    });

    // Update locker with version increment
    await tx.locker.update({
      where: { id: lockerId },
      data: {
        status: 'AVAILABLE',
        currentSessionId: null,
        linkedSeatId: null,
        version: { increment: 1 },
      },
    });

    // Log event
    await tx.eventLog.create({
      data: {
        type: 'RELEASE',
        payload: JSON.stringify({
          lockerId,
          sessionId,
          userTag: locker.currentSession.userTag,
          endedReason,
          releasedAt: new Date().toISOString(),
        }),
        actorRole,
      },
    });

    return { lockerId, sessionId };
  });
}
