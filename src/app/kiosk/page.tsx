'use client';

import { useState, useCallback, useEffect } from 'react';
import { ScannerProvider, useScanner } from '@/components/scanner/ScannerProvider';
import { WebcamScanner } from '@/components/scanner/WebcamScanner';
import { HIDScannerInput } from '@/components/scanner/HIDScannerInput';
import { ProductSelector } from '@/components/kiosk/ProductSelector';
import { PhoneInput } from '@/components/kiosk/PhoneInput';
import { Timer } from '@/components/kiosk/Timer';
import {
  useProducts,
  useCheckIn,
  useCheckOut,
  useLockerAssign,
  useLockerRelease,
  useScanResolve,
  useSettings,
} from '@/hooks/useAppState';
import { cn } from '@/lib/utils';
import type { Seat, Locker } from '@/types';

type FlowStep =
  | 'home'
  | 'scan'
  | 'select-product'
  | 'enter-phone'
  | 'confirm-seat-checkin'
  | 'confirm-seat-checkout'
  | 'confirm-locker-assign'
  | 'confirm-locker-release'
  | 'success'
  | 'error';

type FlowAction = 'seat-checkin' | 'seat-checkout' | 'locker-assign' | 'locker-release' | null;

interface ScanData {
  type: 'SEAT' | 'LOCKER';
  resourceId: string;
  resource: Seat | Locker;
  hasActiveSession: boolean;
}

function KioskContent() {
  const [step, setStep] = useState<FlowStep>('home');
  const [action, setAction] = useState<FlowAction>(null);
  const [scanMode, setScanMode] = useState<'webcam' | 'hid'>('webcam');
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const { data: products, isLoading: productsLoading } = useProducts();
  const checkInMutation = useCheckIn();
  const checkOutMutation = useCheckOut();
  const lockerAssignMutation = useLockerAssign();
  const lockerReleaseMutation = useLockerRelease();
  const scanResolveMutation = useScanResolve();
  const { data: settings } = useSettings();
  const { stopScanning, clearLastScan, lastRaw, lastScanAt } = useScanner();

  useEffect(() => {
    if (step !== 'scan') {
      stopScanning();
    }
  }, [step, stopScanning]);

  useEffect(() => {
    if (step === 'scan' && scanMode === 'hid') {
      stopScanning();
    }
  }, [step, scanMode, stopScanning]);

  useEffect(() => {
    if (!settings?.scanMode) return;
    if (settings.scanMode === 'HID_ONLY') {
      setScanMode('hid');
    }
    if (settings.scanMode === 'WEB_ONLY') {
      setScanMode('webcam');
    }
  }, [settings?.scanMode]);

  useEffect(() => {
    if (step !== 'scan') {
      clearLastScan();
    }
  }, [step, clearLastScan]);

  const handleScanResult = useCallback(async (code: string) => {
    // Resolve the scan through API
    try {
      if (!action) {
        setError('먼저 이용 목적을 선택해주세요');
        setStep('error');
        return;
      }

      const data = await scanResolveMutation.mutateAsync(code);
      if (data.type === 'UNKNOWN') {
        setError('지원되지 않는 코드입니다');
        setStep('error');
        return;
      }

      setScanData(data);
      stopScanning();

      if (action === 'seat-checkin') {
        if (data.type !== 'SEAT') {
          setError('좌석 QR을 스캔해주세요');
          setStep('error');
          return;
        }
        if (data.hasActiveSession) {
          setError('이미 사용 중인 좌석입니다');
          setStep('error');
          return;
        }
        setStep('select-product');
        return;
      }

      if (action === 'seat-checkout') {
        if (data.type !== 'SEAT') {
          setError('좌석 QR을 스캔해주세요');
          setStep('error');
          return;
        }
        if (!data.hasActiveSession) {
          setError('해당 좌석에 활성 세션이 없습니다');
          setStep('error');
          return;
        }
        setStep('confirm-seat-checkout');
        return;
      }

      if (action === 'locker-assign') {
        if (data.type !== 'LOCKER') {
          setError('락커 QR을 스캔해주세요');
          setStep('error');
          return;
        }
        if (data.hasActiveSession) {
          setError('이미 사용 중인 락커입니다');
          setStep('error');
          return;
        }
        setStep('enter-phone');
        return;
      }

      if (action === 'locker-release') {
        if (data.type !== 'LOCKER') {
          setError('락커 QR을 스캔해주세요');
          setStep('error');
          return;
        }
        if (!data.hasActiveSession) {
          setError('해당 락커에 활성 세션이 없습니다');
          setStep('error');
          return;
        }
        setStep('confirm-locker-release');
        return;
      }
    } catch {
      setError('QR 코드를 인식할 수 없습니다');
      setStep('error');
    }
  }, [action, scanResolveMutation, stopScanning]);

  useEffect(() => {
    if (step !== 'scan') {
      return;
    }
    if (!lastRaw || !lastScanAt) {
      return;
    }
    handleScanResult(lastRaw);
  }, [lastRaw, lastScanAt, step, handleScanResult]);

  const handleStartScan = useCallback((nextAction: FlowAction) => {
    setError(null);
    setScanData(null);
    setSelectedProductId(null);
    setPhoneNumber('');
    clearLastScan();
    setAction(nextAction);
    setStep('scan');
  }, [clearLastScan]);

  const handleProductSelect = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setStep('enter-phone');
  }, []);

  const handlePhoneComplete = useCallback(async (phone: string) => {
    if (!scanData) return;

    setPhoneNumber(phone);
    if (action === 'seat-checkin') {
      if (!selectedProductId) return;
      setStep('confirm-seat-checkin');
    } else if (action === 'locker-assign') {
      setStep('confirm-locker-assign');
    }
  }, [scanData, selectedProductId, action]);

  const handleConfirmCheckIn = useCallback(async () => {
    if (!scanData || !selectedProductId || phoneNumber.length !== 4) return;

    try {
      await checkInMutation.mutateAsync({
        seatId: scanData.resourceId,
        productId: selectedProductId,
        userTag: phoneNumber,
      });
      setSuccessMessage(`좌석 ${scanData.resourceId} 체크인 완료!`);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크인에 실패했습니다');
      setStep('error');
    }
  }, [scanData, selectedProductId, phoneNumber, checkInMutation]);

  const handleConfirmCheckOut = useCallback(async () => {
    if (!scanData || phoneNumber.length !== 4) return;

    try {
      await checkOutMutation.mutateAsync({
        seatId: scanData.resourceId,
        userTag: phoneNumber,
      });
      setSuccessMessage(`좌석 ${scanData.resourceId} 체크아웃 완료!`);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '체크아웃에 실패했습니다');
      setStep('error');
    }
  }, [scanData, phoneNumber, checkOutMutation]);

  const handleConfirmLockerAssign = useCallback(async () => {
    if (!scanData || phoneNumber.length !== 4) return;

    try {
      await lockerAssignMutation.mutateAsync({
        lockerId: scanData.resourceId,
        userTag: phoneNumber,
      });
      setSuccessMessage(`락커 ${parseInt(scanData.resourceId)} 배정 완료!`);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '락커 배정에 실패했습니다');
      setStep('error');
    }
  }, [scanData, phoneNumber, lockerAssignMutation]);

  const handleConfirmLockerRelease = useCallback(async () => {
    if (!scanData || phoneNumber.length !== 4) return;

    try {
      await lockerReleaseMutation.mutateAsync({
        lockerId: scanData.resourceId,
        userTag: phoneNumber,
      });
      setSuccessMessage(`락커 ${parseInt(scanData.resourceId)} 반납 완료!`);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '락커 반납에 실패했습니다');
      setStep('error');
    }
  }, [scanData, phoneNumber, lockerReleaseMutation]);

  useEffect(() => {
    if (settings?.checkoutConfirmRequired !== false) {
      return;
    }
    if (phoneNumber.length !== 4) {
      return;
    }
    if (step === 'confirm-seat-checkout' && !checkOutMutation.isPending) {
      handleConfirmCheckOut();
    }
    if (step === 'confirm-locker-release' && !lockerReleaseMutation.isPending) {
      handleConfirmLockerRelease();
    }
  }, [
    settings?.checkoutConfirmRequired,
    phoneNumber,
    step,
    checkOutMutation.isPending,
    lockerReleaseMutation.isPending,
    handleConfirmCheckOut,
    handleConfirmLockerRelease,
  ]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'scan':
        setStep('home');
        break;
      case 'select-product':
        setStep('scan');
        break;
      case 'enter-phone':
        if (action === 'seat-checkin') {
          setStep('select-product');
        } else {
          setStep('scan');
        }
        break;
      case 'confirm-seat-checkin':
        setStep('enter-phone');
        break;
      case 'confirm-seat-checkout':
      case 'confirm-locker-release':
        setStep('scan');
        break;
      case 'confirm-locker-assign':
        setStep('enter-phone');
        break;
      default:
        setStep('home');
    }
  }, [step, action]);

  const handleReset = useCallback(() => {
    setScanData(null);
    setSelectedProductId(null);
    setPhoneNumber('');
    setError(null);
    setSuccessMessage('');
    clearLastScan();
    stopScanning();
    setAction(null);
    setStep('home');
  }, [clearLastScan, stopScanning]);

  // Auto reset after success
  useEffect(() => {
    if (step === 'success') {
      const timer = setTimeout(handleReset, 5000);
      return () => clearTimeout(timer);
    }
  }, [step, handleReset]);

  const renderContent = () => {
    switch (step) {
      case 'home':
        return (
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">환영합니다</h1>
              <p className="text-xl text-gray-600">원하시는 이용 유형을 선택해주세요</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <button
                onClick={() => handleStartScan('seat-checkin')}
                className="px-6 py-6 bg-blue-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                💺 좌석 이용 시작
              </button>
              <button
                onClick={() => handleStartScan('seat-checkout')}
                className="px-6 py-6 bg-red-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-red-700 active:scale-[0.98] transition-all"
              >
                👋 좌석 이용 종료
              </button>
              <button
                onClick={() => handleStartScan('locker-assign')}
                className="px-6 py-6 bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-[0.98] transition-all"
              >
                🔐 락커 배정
              </button>
              <button
                onClick={() => handleStartScan('locker-release')}
                className="px-6 py-6 bg-amber-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-amber-700 active:scale-[0.98] transition-all"
              >
                📦 락커 반납
              </button>
            </div>
          </div>
        );

      case 'scan':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">QR 코드 스캔</h2>
              <p className="text-gray-600">
                {action === 'seat-checkin' && '좌석 QR을 스캔해주세요'}
                {action === 'seat-checkout' && '좌석 QR을 스캔해주세요'}
                {action === 'locker-assign' && '락커 QR을 스캔해주세요'}
                {action === 'locker-release' && '락커 QR을 스캔해주세요'}
              </p>
            </div>

            {(settings?.scanMode ?? 'AUTO') === 'AUTO' && (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setScanMode('webcam')}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium transition-colors',
                    scanMode === 'webcam'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  웹캠 스캔
                </button>
                <button
                  onClick={() => setScanMode('hid')}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium transition-colors',
                    scanMode === 'hid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  스캐너 입력
                </button>
              </div>
            )}

            {scanMode === 'webcam' ? <WebcamScanner /> : <HIDScannerInput />}

            <button
              onClick={handleBack}
              className="w-full max-w-md mx-auto block px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
          </div>
        );

      case 'select-product':
        return (
          <div className="space-y-6 max-w-lg mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                좌석 {scanData?.resourceId}
              </h2>
              <p className="text-gray-600">이용 시간을 선택해주세요</p>
            </div>

            {productsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto" />
              </div>
            ) : (
              <ProductSelector
                products={products || []}
                selectedId={selectedProductId}
                onSelect={handleProductSelect}
              />
            )}

            <button
              onClick={handleBack}
              className="w-full px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
            >
              취소
            </button>
          </div>
        );

      case 'enter-phone':
        return (
          <div className="space-y-8 max-w-lg mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">휴대폰 번호 입력</h2>
              <p className="text-gray-600">본인 확인을 위해 번호 뒷자리를 입력해주세요</p>
            </div>

            <PhoneInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              onComplete={handlePhoneComplete}
            />

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                이전
              </button>
              <button
                onClick={() => handlePhoneComplete(phoneNumber)}
                disabled={phoneNumber.length !== 4}
                className={cn(
                  'flex-1 px-6 py-4 text-lg font-bold rounded-xl transition-colors',
                  phoneNumber.length === 4
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                다음
              </button>
            </div>
          </div>
        );

      case 'confirm-seat-checkin':
        return (
          <div className="space-y-8 max-w-lg mx-auto text-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">체크인 확인</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="text-6xl">💺</div>
                <div className="text-3xl font-bold text-blue-600">
                  좌석 {scanData?.resourceId}
                </div>
                <div className="text-xl text-gray-600">
                  {products?.find(p => p.id === selectedProductId)?.name}
                </div>
                <div className="text-gray-500">
                  전화번호: ***-****-{phoneNumber}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleConfirmCheckIn}
                disabled={checkInMutation.isPending}
                className="flex-1 px-6 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:bg-blue-400"
              >
                {checkInMutation.isPending ? '처리 중...' : '체크인'}
              </button>
            </div>
          </div>
        );

      case 'confirm-seat-checkout':
        return (
          <div className="space-y-8 max-w-lg mx-auto text-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">체크아웃</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="text-6xl">👋</div>
                <div className="text-3xl font-bold text-blue-600">
                  좌석 {scanData?.resourceId}
                </div>
                {(scanData?.resource as Seat)?.currentSession?.endAt && (
                  <div className="space-y-2">
                    <div className="text-gray-500">남은 시간</div>
                    <Timer
                      endAt={(scanData?.resource as Seat)?.currentSession?.endAt as Date}
                      size="lg"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">본인 확인을 위해 번호 뒷자리를 입력해주세요</p>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmCheckOut}
                disabled={phoneNumber.length !== 4 || checkOutMutation.isPending}
                className={cn(
                  'flex-1 px-6 py-4 text-lg font-bold rounded-xl transition-colors',
                  phoneNumber.length === 4 && !checkOutMutation.isPending
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                {checkOutMutation.isPending
                  ? '처리 중...'
                  : settings?.checkoutConfirmRequired === false
                    ? '자동 처리 중'
                    : '체크아웃'}
              </button>
            </div>
          </div>
        );

      case 'confirm-locker-assign':
        return (
          <div className="space-y-8 max-w-lg mx-auto text-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">락커 배정 확인</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="text-6xl">🔐</div>
                <div className="text-3xl font-bold text-emerald-600">
                  락커 {parseInt(scanData?.resourceId ?? '0')}
                </div>
                <div className="text-gray-500">
                  전화번호: ***-****-{phoneNumber}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleBack}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                이전
              </button>
              <button
                onClick={handleConfirmLockerAssign}
                disabled={lockerAssignMutation.isPending}
                className="flex-1 px-6 py-4 bg-emerald-600 text-white text-lg font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-emerald-400"
              >
                {lockerAssignMutation.isPending ? '처리 중...' : '배정'}
              </button>
            </div>
          </div>
        );

      case 'confirm-locker-release':
        return (
          <div className="space-y-8 max-w-lg mx-auto text-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">락커 반납</h2>
              <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="text-6xl">📦</div>
                <div className="text-3xl font-bold text-amber-600">
                  락커 {parseInt(scanData?.resourceId ?? '0')}
                </div>
                {(scanData?.resource as Locker)?.linkedSeatId && (
                  <div className="text-gray-500">
                    연동 좌석: {(scanData?.resource as Locker).linkedSeatId}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">본인 확인을 위해 번호 뒷자리를 입력해주세요</p>
              <PhoneInput
                value={phoneNumber}
                onChange={setPhoneNumber}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmLockerRelease}
                disabled={phoneNumber.length !== 4 || lockerReleaseMutation.isPending}
                className={cn(
                  'flex-1 px-6 py-4 text-lg font-bold rounded-xl transition-colors',
                  phoneNumber.length === 4 && !lockerReleaseMutation.isPending
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                {lockerReleaseMutation.isPending
                  ? '처리 중...'
                  : settings?.checkoutConfirmRequired === false
                    ? '자동 처리 중'
                    : '반납'}
              </button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="text-8xl animate-bounce">✅</div>
            <div className="text-3xl font-bold text-green-600">{successMessage}</div>
            <p className="text-gray-500">5초 후 자동으로 처음 화면으로 돌아갑니다</p>
            <button
              onClick={handleReset}
              className="px-8 py-4 bg-gray-200 text-gray-700 text-lg font-medium rounded-xl hover:bg-gray-300 transition-colors"
            >
              처음으로
            </button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="text-8xl">❌</div>
            <div className="text-2xl font-bold text-red-600">{error}</div>
            <button
              onClick={handleReset}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        {renderContent()}
      </div>
    </div>
  );
}

export default function KioskPage() {
  return (
    <ScannerProvider>
      <KioskContent />
    </ScannerProvider>
  );
}
