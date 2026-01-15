import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format price with comma separators (Korean won)
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return days === 1 ? '1일권' : `${days}일권`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}시간`;
    }
    return `${hours}시간 ${remainingMinutes}분`;
  }
  return `${minutes}분`;
}

/**
 * Calculate remaining time from endAt
 */
export function getRemainingTime(endAt: Date | string): {
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
} {
  const end = new Date(endAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return {
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formatted: '만료됨',
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}시간 ${remainingMinutes}분`;
  } else if (minutes > 0) {
    formatted = `${minutes}분 ${seconds}초`;
  } else {
    formatted = `${seconds}초`;
  }

  return {
    minutes,
    seconds,
    isExpired: false,
    formatted,
  };
}

/**
 * Generate seat ID from row and column
 */
export function generateSeatId(row: string, col: number): string {
  return `${row}${col}`;
}

/**
 * Generate locker ID with zero-padding
 */
export function generateLockerId(num: number): string {
  return String(num).padStart(3, '0');
}
