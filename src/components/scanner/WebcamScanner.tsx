'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebcamScannerAdapter } from '@/scanner/WebcamScannerAdapter';
import { useScanner } from './ScannerProvider';
import { cn } from '@/lib/utils';

interface WebcamScannerProps {
  className?: string;
  onScanComplete?: () => void;
}

export function WebcamScanner({ className, onScanComplete }: WebcamScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<WebcamScannerAdapter | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const { startScanning, stopScanning, isScanning, lastScan, error } = useScanner();

  const elementId = 'webcam-scanner-container';

  const initScanner = useCallback(async () => {
    if (!containerRef.current) return;

    setIsInitializing(true);
    setCameraError(null);

    try {
      const adapter = new WebcamScannerAdapter({
        elementId,
        facingMode: 'environment',
        cameraId: selectedCameraId || undefined,
        fps: 10,
        qrboxSize: 250,
      });

      scannerRef.current = adapter;
      await startScanning(adapter);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access failed';
      setCameraError(message);
      console.error('Camera error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [startScanning, selectedCameraId]);

  useEffect(() => {
    const loadCameras = async () => {
      const list = await WebcamScannerAdapter.getCameras();
      setCameras(list);
      if (list.length > 0) {
        setSelectedCameraId((prev) => prev ?? list[0].id);
      }
    };

    loadCameras();

    return () => {
      if (scannerRef.current) {
        stopScanning();
        scannerRef.current = null;
      }
    };
  }, [stopScanning]);

  useEffect(() => {
    if (cameras.length > 0 && !selectedCameraId) {
      return;
    }
    initScanner();
  }, [cameras.length, selectedCameraId, initScanner]);

  // Call onScanComplete when a scan is detected
  useEffect(() => {
    if (lastScan && onScanComplete) {
      onScanComplete();
    }
  }, [lastScan, onScanComplete]);

  return (
    <div className={cn('relative w-full max-w-md mx-auto', className)}>
      {cameras.length > 1 && (
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            카메라 선택
          </label>
          <select
            value={selectedCameraId ?? ''}
            onChange={(event) => setSelectedCameraId(event.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {cameras.map((camera) => (
              <option key={camera.id} value={camera.id}>
                {camera.label || `Camera ${camera.id}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Camera container */}
      <div
        id={elementId}
        ref={containerRef}
        className="relative aspect-square bg-gray-900 rounded-xl overflow-hidden"
      >
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
              <p>카메라 초기화 중...</p>
            </div>
          </div>
        )}

        {(cameraError || error) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white p-6">
            <div className="text-center">
              <div className="text-red-400 text-5xl mb-4">⚠️</div>
              <p className="text-lg mb-2">카메라 접근 실패</p>
              <p className="text-sm text-gray-400">{cameraError || error}</p>
              <button
                onClick={initScanner}
                className="mt-4 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scanning indicator */}
      {isScanning && !isInitializing && (
        <div className="mt-4 text-center text-gray-600">
          <div className="flex items-center justify-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span>QR 코드를 스캔해주세요</span>
          </div>
        </div>
      )}

      {/* Scan result preview */}
      {lastScan && (
        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg text-center">
          <p className="text-green-800 font-medium">
            {lastScan.type === 'SEAT' && `좌석 ${lastScan.resourceId} 인식됨`}
            {lastScan.type === 'LOCKER' && `락커 ${lastScan.resourceId} 인식됨`}
            {lastScan.type === 'UNKNOWN' && '인식할 수 없는 코드'}
          </p>
        </div>
      )}
    </div>
  );
}
