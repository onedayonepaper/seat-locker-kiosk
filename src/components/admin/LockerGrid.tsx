'use client';

import { cn } from '@/lib/utils';
import type { Locker } from '@/types';

interface LockerGridProps {
  lockers: Locker[];
  onLockerClick: (locker: Locker) => void;
  selectedLockerId?: string | null;
}

const statusColors = {
  AVAILABLE: 'bg-green-500 hover:bg-green-600',
  OCCUPIED: 'bg-blue-500 hover:bg-blue-600',
  DISABLED: 'bg-gray-400',
};

export function LockerGrid({ lockers, onLockerClick, selectedLockerId }: LockerGridProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {lockers.map((locker) => (
        <button
          key={locker.id}
          onClick={() => onLockerClick(locker)}
          disabled={locker.status === 'DISABLED'}
          className={cn(
            'w-16 h-16 rounded-lg flex flex-col items-center justify-center text-white font-medium shadow-md transition-all',
            statusColors[locker.status as keyof typeof statusColors],
            selectedLockerId === locker.id && 'ring-4 ring-yellow-400 ring-offset-2',
            locker.status !== 'DISABLED' && 'cursor-pointer active:scale-95'
          )}
        >
          <span className="text-xs opacity-75">락커</span>
          <span className="font-bold">{parseInt(locker.id)}</span>
        </button>
      ))}
    </div>
  );
}
