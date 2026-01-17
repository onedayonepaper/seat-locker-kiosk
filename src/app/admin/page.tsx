'use client';

import { useMemo, useState } from 'react';
import { useAppState, useEventLogs } from '@/hooks/useAppState';
import { SeatGrid } from '@/components/admin/SeatGrid';
import { LockerGrid } from '@/components/admin/LockerGrid';
import { SessionDetails } from '@/components/admin/SessionDetails';
import { cn } from '@/lib/utils';
import { useRole } from '@/components/admin/RoleProvider';
import type { Seat, Locker } from '@/types';

export default function AdminDashboard() {
  const { role } = useRole();
  const { data, isLoading, error, refetch } = useAppState();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [seatFilter, setSeatFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'EXPIRED'>('ALL');
  const [lockerFilter, setLockerFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL');
  const [logSearch, setLogSearch] = useState('');
  const { data: logs, isLoading: logsLoading } = useEventLogs(logSearch, 60);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  // 모든 데이터 추출 (hooks 규칙 준수를 위해 조건부 return 전에 선언)
  const seats = data?.seats || [];
  const lockers = data?.lockers || [];
  const sessions = data?.sessions || [];

  const parsedLogs = useMemo(() => {
    return logs?.map((log) => {
      try {
        return { ...log, parsedPayload: JSON.parse(log.payload) };
      } catch {
        return { ...log, parsedPayload: null };
      }
    });
  }, [logs]);

  const selectedLog = useMemo(() => {
    return parsedLogs?.find((log) => log.id === selectedLogId) ?? null;
  }, [parsedLogs, selectedLogId]);

  const filteredSeats = useMemo(() => {
    return seats.filter((seat) => {
      if (seatFilter !== 'ALL' && seat.status !== seatFilter) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        seat.id.toLowerCase().includes(term) ||
        seat.name?.toLowerCase().includes(term) ||
        seat.currentSession?.userTag?.includes(term)
      );
    });
  }, [seats, seatFilter, searchTerm]);

  const filteredLockers = useMemo(() => {
    return lockers.filter((locker) => {
      if (lockerFilter !== 'ALL' && locker.status !== lockerFilter) {
        return false;
      }
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        locker.id.toLowerCase().includes(term) ||
        locker.name?.toLowerCase().includes(term) ||
        locker.currentSession?.userTag?.includes(term)
      );
    });
  }, [lockers, lockerFilter, searchTerm]);

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태 처리
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-900 font-medium mb-2">데이터 로딩 실패</p>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // Calculate stats
  const stats = {
    availableSeats: seats.filter((s) => s.status === 'AVAILABLE').length,
    occupiedSeats: seats.filter((s) => s.status === 'OCCUPIED').length,
    expiredSeats: seats.filter((s) => s.status === 'EXPIRED').length,
    availableLockers: lockers.filter((l) => l.status === 'AVAILABLE').length,
    occupiedLockers: lockers.filter((l) => l.status === 'OCCUPIED').length,
    activeSessions: sessions.length,
  };

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">사용 가능 좌석</div>
          <div className="text-3xl font-bold text-green-600">{stats.availableSeats}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">사용 중 좌석</div>
          <div className="text-3xl font-bold text-blue-600">{stats.occupiedSeats}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">만료된 좌석</div>
          <div className="text-3xl font-bold text-red-600">{stats.expiredSeats}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">사용 가능 락커</div>
          <div className="text-3xl font-bold text-green-600">{stats.availableLockers}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">사용 중 락커</div>
          <div className="text-3xl font-bold text-blue-600">{stats.occupiedLockers}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="text-sm text-gray-500">활성 세션</div>
          <div className="text-3xl font-bold text-gray-900">{stats.activeSessions}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="좌석/락커/전화번호 검색"
            className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-gray-300"
          />
          <div className="flex gap-2">
            {(['ALL', 'AVAILABLE', 'OCCUPIED', 'EXPIRED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSeatFilter(status)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  seatFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {status === 'ALL' && '좌석 전체'}
                {status === 'AVAILABLE' && '좌석 빈자리'}
                {status === 'OCCUPIED' && '좌석 사용중'}
                {status === 'EXPIRED' && '좌석 만료'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'AVAILABLE', 'OCCUPIED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setLockerFilter(status)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                lockerFilter === status
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {status === 'ALL' && '락커 전체'}
              {status === 'AVAILABLE' && '락커 빈자리'}
              {status === 'OCCUPIED' && '락커 사용중'}
            </button>
          ))}
        </div>
      </div>

      {/* Seat Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">좌석 현황</h2>
          <span className="text-sm text-gray-500">{filteredSeats.length}개 표시</span>
        </div>
        <SeatGrid
          seats={filteredSeats}
          onSeatClick={(seat) => setSelectedSeat(seat)}
          selectedSeatId={selectedSeat?.id}
        />
      </div>

      {/* Locker Grid */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">락커 현황</h2>
          <span className="text-sm text-gray-500">{filteredLockers.length}개 표시</span>
        </div>
        <LockerGrid
          lockers={filteredLockers}
          onLockerClick={(locker) => setSelectedLocker(locker)}
          selectedLockerId={selectedLocker?.id}
        />
      </div>

      {role === 'ADMIN' && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">이력 로그</h2>
            <input
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
              placeholder="로그 검색"
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '좌석', value: 'SEAT' },
              { label: '락커', value: 'LOCKER' },
              { label: '체크인', value: 'CHECK_IN' },
              { label: '체크아웃', value: 'CHECK_OUT' },
              { label: '연장', value: 'EXTEND' },
              { label: '강제종료', value: 'FORCE_END' },
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setLogSearch(preset.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  logSearch === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setLogSearch('')}
              className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-500 hover:text-gray-700"
            >
              초기화
            </button>
          </div>
          {logsLoading ? (
            <div className="text-gray-500 text-sm">로그 불러오는 중...</div>
          ) : (
            <div className="max-h-72 overflow-auto border rounded-lg divide-y">
              {parsedLogs?.map((log) => (
                <div key={log.id} className="px-4 py-3 text-sm">
                  <button
                    type="button"
                    onClick={() => setSelectedLogId(log.id)}
                    className="w-full text-left space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{log.type}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">actor: {log.actorRole}</div>
                    {log.parsedPayload ? (
                      <div className="text-xs text-gray-600">
                        {log.parsedPayload.seatId && `seat: ${log.parsedPayload.seatId} `}
                        {log.parsedPayload.lockerId && `locker: ${log.parsedPayload.lockerId} `}
                        {log.parsedPayload.userTag && `user: ${log.parsedPayload.userTag}`}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-600 break-all">{log.payload}</div>
                    )}
                  </button>
                </div>
              ))}
              {logs && logs.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  표시할 로그가 없습니다
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSeat && (
        <SessionDetails
          resource={selectedSeat}
          resourceType="SEAT"
          onClose={() => setSelectedSeat(null)}
        />
      )}
      {selectedLocker && (
        <SessionDetails
          resource={selectedLocker}
          resourceType="LOCKER"
          activeSeatSessions={sessions.filter(
            (sessionItem) => sessionItem.resourceType === 'SEAT' && sessionItem.status === 'ACTIVE'
          )}
          onClose={() => setSelectedLocker(null)}
        />
      )}

      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">로그 상세</h3>
              <button
                onClick={() => setSelectedLogId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <div>type: {selectedLog.type}</div>
              <div>actor: {selectedLog.actorRole}</div>
              <div>time: {new Date(selectedLog.createdAt).toLocaleString('ko-KR')}</div>
            </div>
            <div className="border rounded-lg p-3 text-sm bg-gray-50">
              {selectedLog.parsedPayload ? (
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify(selectedLog.parsedPayload, null, 2)}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {selectedLog.payload}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
