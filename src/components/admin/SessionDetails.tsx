'use client';

import { useState } from 'react';
import { Timer } from '@/components/kiosk/Timer';
import {
  useCheckIn,
  useCheckOut,
  useExtendSession,
  useLockerAssign,
  useLockerRelease,
  useProducts,
} from '@/hooks/useAppState';
import { cn, formatDuration } from '@/lib/utils';
import type { Seat, Locker, Product, Session } from '@/types';
import { useRole } from '@/components/admin/RoleProvider';

interface SessionDetailsProps {
  resource: Seat | Locker;
  resourceType: 'SEAT' | 'LOCKER';
  activeSeatSessions?: Session[];
  onClose: () => void;
}

export function SessionDetails({
  resource,
  resourceType,
  activeSeatSessions = [],
  onClose,
}: SessionDetailsProps) {
  const [showExtend, setShowExtend] = useState(false);
  const [confirmForceEnd, setConfirmForceEnd] = useState(false);
  const [manualUserTag, setManualUserTag] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [linkedSeatSessionId, setLinkedSeatSessionId] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);

  const { data: products } = useProducts();
  const { role, requestAdmin } = useRole();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const lockerAssignMutation = useLockerAssign();
  const lockerReleaseMutation = useLockerRelease();
  const extendMutation = useExtendSession();

  const session = resource.currentSession;
  const isSeat = resourceType === 'SEAT';
  const availableProducts = products?.filter((product) => product.isActive) || [];

  const handleForceEnd = async () => {
    if (role !== 'ADMIN') {
      const ok = await requestAdmin();
      if (!ok) return;
    }
    try {
      if (isSeat) {
        await checkOutMutation.mutateAsync({
          seatId: resource.id,
          force: true,
        });
      } else {
        await lockerReleaseMutation.mutateAsync({
          lockerId: resource.id,
          force: true,
        });
      }
      onClose();
    } catch (error) {
      console.error('Force end failed:', error);
    }
  };

  const handleManualAssign = async () => {
    setManualError(null);
    if (!/^\d{4}$/.test(manualUserTag)) {
      setManualError('전화번호 뒷 4자리를 입력해주세요');
      return;
    }

    if (isSeat) {
      if (!selectedProductId) {
        setManualError('상품을 선택해주세요');
        return;
      }
      try {
        await checkInMutation.mutateAsync({
          seatId: resource.id,
          productId: selectedProductId,
          userTag: manualUserTag,
        });
        onClose();
      } catch (error) {
        setManualError(error instanceof Error ? error.message : '체크인에 실패했습니다');
      }
      return;
    }

    try {
      await lockerAssignMutation.mutateAsync({
        lockerId: resource.id,
        userTag: manualUserTag,
        linkedSeatSessionId: linkedSeatSessionId || undefined,
      });
      onClose();
    } catch (error) {
      setManualError(error instanceof Error ? error.message : '락커 배정에 실패했습니다');
    }
  };

  const handleExtend = async (product: Product) => {
    if (role !== 'ADMIN') {
      const ok = await requestAdmin();
      if (!ok) return;
    }
    try {
      await extendMutation.mutateAsync({
        seatId: resource.id,
        productId: product.id,
      });
      setShowExtend(false);
    } catch (error) {
      console.error('Extend failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {isSeat ? '좌석' : '락커'} {resource.id}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status */}
        <div className={cn(
          'p-4 rounded-xl text-center',
          resource.status === 'AVAILABLE' && 'bg-green-100',
          resource.status === 'OCCUPIED' && 'bg-blue-100',
          resource.status === 'EXPIRED' && 'bg-red-100',
          resource.status === 'DISABLED' && 'bg-gray-100',
        )}>
          <div className="text-lg font-medium">
            {resource.status === 'AVAILABLE' && '사용 가능'}
            {resource.status === 'OCCUPIED' && '사용 중'}
            {resource.status === 'EXPIRED' && '만료됨'}
            {resource.status === 'DISABLED' && '사용 불가'}
          </div>
        </div>

        {/* Session Info */}
        {session && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">이용자</div>
                <div className="font-medium">***-****-{session.userTag}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-500">상품</div>
                <div className="font-medium">{session.product?.name || '-'}</div>
              </div>
            </div>

            {session.endAt && (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-500 mb-2">남은 시간</div>
                <Timer endAt={session.endAt} size="lg" />
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3 pt-4 border-t">
              {isSeat && session.endAt && !showExtend && (
                <button
                  onClick={() => setShowExtend(true)}
                  className="w-full py-3 bg-blue-100 text-blue-700 font-medium rounded-xl hover:bg-blue-200 transition-colors"
                >
                  시간 연장
                </button>
              )}

              {showExtend && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">연장할 시간 선택</div>
                  <div className="grid grid-cols-2 gap-2">
                    {products?.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleExtend(product)}
                        disabled={extendMutation.isPending}
                        className="py-2 px-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      >
                        {formatDuration(product.durationMin)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowExtend(false)}
                    className="w-full py-2 text-gray-500 text-sm"
                  >
                    취소
                  </button>
                </div>
              )}

              {!confirmForceEnd ? (
                <button
                  onClick={() => setConfirmForceEnd(true)}
                  className="w-full py-3 bg-red-100 text-red-700 font-medium rounded-xl hover:bg-red-200 transition-colors"
                >
                  강제 종료
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-center text-red-600 font-medium">
                    정말 강제 종료하시겠습니까?
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmForceEnd(false)}
                      className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleForceEnd}
                      disabled={checkOutMutation.isPending || lockerReleaseMutation.isPending}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      확인
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!session && (
          <div className="space-y-4">
            <div className="text-center text-gray-500">
              현재 세션이 없습니다
            </div>
            <div className="border-t pt-4 space-y-4">
              <div className="text-sm font-medium text-gray-700">
                {isSeat ? '좌석 수동 체크인' : '락커 수동 배정'}
              </div>

              {isSeat && (
                <div className="grid grid-cols-2 gap-2">
                  {availableProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={cn(
                        'py-2 px-3 rounded-lg text-sm transition-colors',
                        selectedProductId === product.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      )}
                    >
                      {formatDuration(product.durationMin)}
                    </button>
                  ))}
                </div>
              )}

              <input
                value={manualUserTag}
                onChange={(event) => setManualUserTag(event.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="전화번호 뒷 4자리"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />

              {!isSeat && activeSeatSessions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">좌석 세션 연동 (선택)</div>
                  <select
                    value={linkedSeatSessionId}
                    onChange={(event) => setLinkedSeatSessionId(event.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  >
                    <option value="">연동하지 않음</option>
                    {activeSeatSessions.map((sessionItem) => (
                      <option key={sessionItem.id} value={sessionItem.id}>
                        좌석 {sessionItem.resourceId} / {sessionItem.userTag}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {manualError && (
                <div className="text-sm text-red-600">{manualError}</div>
              )}

              <button
                onClick={handleManualAssign}
                disabled={
                  checkInMutation.isPending ||
                  lockerAssignMutation.isPending
                }
                className={cn(
                  'w-full py-3 font-medium rounded-xl transition-colors',
                  isSeat ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
                )}
              >
                {isSeat ? '체크인 처리' : '배정 처리'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
