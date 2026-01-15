'use client';

import { useState, useEffect } from 'react';
import { getRemainingTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TimerProps {
  endAt: Date | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWarning?: boolean;
  warningThresholdMinutes?: number;
}

export function Timer({
  endAt,
  className,
  size = 'md',
  showWarning = true,
  warningThresholdMinutes = 10,
}: TimerProps) {
  const [remaining, setRemaining] = useState(() => getRemainingTime(endAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemainingTime(endAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [endAt]);

  const isWarning = showWarning && remaining.minutes <= warningThresholdMinutes && !remaining.isExpired;
  const isExpired = remaining.isExpired;

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  };

  return (
    <div
      className={cn(
        'font-mono font-bold tabular-nums',
        sizeClasses[size],
        isExpired && 'text-red-600 animate-pulse',
        isWarning && !isExpired && 'text-orange-500',
        !isWarning && !isExpired && 'text-gray-900',
        className
      )}
    >
      {remaining.formatted}
    </div>
  );
}
