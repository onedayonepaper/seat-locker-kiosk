'use client';

import { cn } from '@/lib/utils';
import { Timer } from '@/components/kiosk/Timer';
import type { Seat } from '@/types';

interface SeatGridProps {
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
  selectedSeatId?: string | null;
}

const statusColors = {
  AVAILABLE: 'bg-green-500 hover:bg-green-600',
  OCCUPIED: 'bg-blue-500 hover:bg-blue-600',
  EXPIRED: 'bg-red-500 hover:bg-red-600 animate-pulse',
  DISABLED: 'bg-gray-400',
};

const statusLabels = {
  AVAILABLE: '사용 가능',
  OCCUPIED: '사용 중',
  EXPIRED: '만료됨',
  DISABLED: '사용 불가',
};

export function SeatGrid({ seats, onSeatClick, selectedSeatId }: SeatGridProps) {
  // Group seats by row
  const rows = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = [];
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, Seat[]>);

  // Sort rows alphabetically and seats by column
  const sortedRows = Object.keys(rows).sort();
  sortedRows.forEach((row) => {
    rows[row].sort((a, b) => a.col - b.col);
  });

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('w-4 h-4 rounded', color.split(' ')[0])} />
            <span className="text-gray-600">
              {statusLabels[status as keyof typeof statusLabels]}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="bg-gray-100 rounded-xl p-6 inline-block">
        <div className="space-y-2">
          {sortedRows.map((row) => (
            <div key={row} className="flex gap-2">
              {/* Row label */}
              <div className="w-8 h-24 flex items-center justify-center font-bold text-gray-500">
                {row}
              </div>

              {/* Seats in row */}
              {rows[row].map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => onSeatClick(seat)}
                  disabled={seat.status === 'DISABLED'}
                  className={cn(
                    'w-24 h-24 rounded-lg flex flex-col items-center justify-center text-white font-medium shadow-md transition-all',
                    statusColors[seat.status as keyof typeof statusColors],
                    selectedSeatId === seat.id && 'ring-4 ring-yellow-400 ring-offset-2',
                    seat.status !== 'DISABLED' && 'cursor-pointer active:scale-95'
                  )}
                >
                  <span className="text-lg font-bold">{seat.id}</span>
                  {seat.currentSession?.endAt && (
                    <Timer
                      endAt={seat.currentSession.endAt}
                      size="sm"
                      className="text-white/90"
                      showWarning={false}
                    />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
