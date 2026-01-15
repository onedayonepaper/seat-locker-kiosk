import type { ScanResult } from '@/scanner/types';

/**
 * QR Code format patterns
 * SEAT:A12 - Seat A12
 * LOCKER:032 - Locker number 032
 * APP1|SEAT|A12|v1 - Extended format
 */
const SEAT_PATTERN = /^SEAT:([A-Z]\d{1,2})$/i;
const LOCKER_PATTERN = /^LOCKER:(\d{1,3})$/i;
const APP1_PATTERN = /^APP1\|([A-Z]+)\|([A-Z0-9]+)\|v\d+(?:\|.*)?$/i;

/**
 * Parse a QR code string into a structured result
 * @param raw - Raw scanned string
 * @returns Parsed scan result with type and resource ID
 */
export function parseQRCode(raw: string): ScanResult {
  const trimmed = raw.trim();

  const appMatch = trimmed.match(APP1_PATTERN);
  if (appMatch) {
    const [, typeRaw, idRaw] = appMatch;
    const type = typeRaw.toUpperCase();
    if (type === 'SEAT') {
      return {
        raw,
        type: 'SEAT',
        resourceId: idRaw.toUpperCase(),
      };
    }
    if (type === 'LOCKER') {
      return {
        raw,
        type: 'LOCKER',
        resourceId: idRaw.padStart(3, '0'),
      };
    }
  }

  // Try to match seat pattern
  const seatMatch = trimmed.match(SEAT_PATTERN);
  if (seatMatch) {
    return {
      raw,
      type: 'SEAT',
      resourceId: seatMatch[1].toUpperCase(),
    };
  }

  // Try to match locker pattern
  const lockerMatch = trimmed.match(LOCKER_PATTERN);
  if (lockerMatch) {
    // Pad locker ID to 3 digits
    const lockerId = lockerMatch[1].padStart(3, '0');
    return {
      raw,
      type: 'LOCKER',
      resourceId: lockerId,
    };
  }

  // Unknown format
  return {
    raw,
    type: 'UNKNOWN',
    resourceId: null,
  };
}

/**
 * Generate a QR code value for a seat
 * @param seatId - Seat ID (e.g., "A12")
 * @returns QR code value (e.g., "SEAT:A12")
 */
export function generateSeatQRValue(
  seatId: string,
  format?: 'LEGACY' | 'APP1'
): string {
  const normalized = seatId.toUpperCase();
  if (format === 'APP1') {
    return `APP1|SEAT|${normalized}|v1`;
  }
  return `SEAT:${normalized}`;
}

/**
 * Generate a QR code value for a locker
 * @param lockerId - Locker ID or number
 * @returns QR code value (e.g., "LOCKER:032")
 */
export function generateLockerQRValue(
  lockerId: string | number,
  format?: 'LEGACY' | 'APP1'
): string {
  const id = typeof lockerId === 'number'
    ? String(lockerId).padStart(3, '0')
    : lockerId.padStart(3, '0');
  if (format === 'APP1') {
    return `APP1|LOCKER|${id}|v1`;
  }
  return `LOCKER:${id}`;
}

/**
 * Validate user tag format (phone last 4 digits)
 * @param userTag - User identification string
 * @returns True if valid format
 */
export function validateUserTag(userTag: string): boolean {
  return /^\d{4}$/.test(userTag);
}
