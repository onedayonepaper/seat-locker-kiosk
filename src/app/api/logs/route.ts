import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/logs - Get recent event logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const search = searchParams.get('search')?.trim();
    const limit = Math.min(Number(limitParam) || 50, 200);
    const retentionEntry = await db.appConfig.findUnique({
      where: { key: 'logRetentionDays' },
    });
    const retentionDays = retentionEntry ? Number(retentionEntry.value) : 90;

    if (!Number.isNaN(retentionDays) && retentionDays > 0) {
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      await db.eventLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
    }

    const logs = await db.eventLog.findMany({
      where: search
        ? {
            OR: [
              { type: { contains: search } },
              { actorRole: { contains: search } },
              { payload: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
