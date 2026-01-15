import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const DEFAULTS = {
  qrFormat: 'LEGACY',
  expirationHandling: 'MANUAL',
  checkoutConfirmRequired: 'true',
  scanMode: 'AUTO',
  logRetentionDays: '90',
} as const;

async function getSetting(key: string, fallback: string) {
  const entry = await db.appConfig.findUnique({ where: { key } });
  return entry?.value ?? fallback;
}

async function setSetting(key: string, value: string) {
  await db.appConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// GET /api/settings - Get app settings
export async function GET() {
  try {
    const [qrFormat, expirationHandling, checkoutConfirmRequired, scanMode, logRetentionDays] =
      await Promise.all([
      getSetting('qrFormat', DEFAULTS.qrFormat),
      getSetting('expirationHandling', DEFAULTS.expirationHandling),
      getSetting('checkoutConfirmRequired', DEFAULTS.checkoutConfirmRequired),
      getSetting('scanMode', DEFAULTS.scanMode),
      getSetting('logRetentionDays', DEFAULTS.logRetentionDays),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        qrFormat,
        expirationHandling,
        checkoutConfirmRequired: checkoutConfirmRequired === 'true',
        scanMode,
        logRetentionDays: Number(logRetentionDays),
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update app settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      qrFormat,
      expirationHandling,
      checkoutConfirmRequired,
      scanMode,
      logRetentionDays,
      adminPasscode,
    } = body;

    if (qrFormat && !['LEGACY', 'APP1'].includes(qrFormat)) {
      return NextResponse.json(
        { success: false, error: 'Invalid qrFormat' },
        { status: 400 }
      );
    }

    if (expirationHandling && !['MANUAL', 'AUTO'].includes(expirationHandling)) {
      return NextResponse.json(
        { success: false, error: 'Invalid expirationHandling' },
        { status: 400 }
      );
    }

    if (scanMode && !['AUTO', 'HID_ONLY', 'WEB_ONLY'].includes(scanMode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid scanMode' },
        { status: 400 }
      );
    }

    if (logRetentionDays !== undefined) {
      const value = Number(logRetentionDays);
      if (Number.isNaN(value) || value < 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid logRetentionDays' },
          { status: 400 }
        );
      }
    }

    if (adminPasscode !== undefined) {
      const passcodeValue = String(adminPasscode);
      if (!/^\d{4,8}$/.test(passcodeValue)) {
        return NextResponse.json(
          { success: false, error: 'Invalid adminPasscode' },
          { status: 400 }
        );
      }
    }

    const updates: Promise<void>[] = [];
    if (qrFormat) updates.push(setSetting('qrFormat', qrFormat));
    if (expirationHandling) updates.push(setSetting('expirationHandling', expirationHandling));
    if (checkoutConfirmRequired !== undefined) {
      updates.push(setSetting('checkoutConfirmRequired', checkoutConfirmRequired ? 'true' : 'false'));
    }
    if (scanMode) updates.push(setSetting('scanMode', scanMode));
    if (logRetentionDays !== undefined) {
      updates.push(setSetting('logRetentionDays', String(logRetentionDays)));
    }
    if (adminPasscode !== undefined) {
      updates.push(setSetting('adminPasscode', String(adminPasscode)));
    }

    await Promise.all(updates);

    const [
      updatedQrFormat,
      updatedExpiration,
      updatedCheckoutConfirmRequired,
      updatedScanMode,
      updatedLogRetentionDays,
    ] = await Promise.all([
      getSetting('qrFormat', DEFAULTS.qrFormat),
      getSetting('expirationHandling', DEFAULTS.expirationHandling),
      getSetting('checkoutConfirmRequired', DEFAULTS.checkoutConfirmRequired),
      getSetting('scanMode', DEFAULTS.scanMode),
      getSetting('logRetentionDays', DEFAULTS.logRetentionDays),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        qrFormat: updatedQrFormat,
        expirationHandling: updatedExpiration,
        checkoutConfirmRequired: updatedCheckoutConfirmRequired === 'true',
        scanMode: updatedScanMode,
        logRetentionDays: Number(updatedLogRetentionDays),
      },
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
