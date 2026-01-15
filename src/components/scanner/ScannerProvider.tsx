'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { ScanInputAdapter, ScanResult } from '@/scanner/types';
import { parseQRCode } from '@/lib/qr-parser';

interface ScannerContextType {
  lastScan: ScanResult | null;
  lastRaw: string | null;
  lastScanAt: number | null;
  isScanning: boolean;
  scannerType: 'webcam' | 'hid' | null;
  startScanning: (adapter: ScanInputAdapter) => Promise<void>;
  stopScanning: () => Promise<void>;
  emitScan: (code: string) => void;
  clearLastScan: () => void;
  error: string | null;
}

const ScannerContext = createContext<ScannerContextType | null>(null);

interface ScannerProviderProps {
  children: ReactNode;
  onScan?: (result: ScanResult) => void;
}

export function ScannerProvider({ children, onScan }: ScannerProviderProps) {
  const [adapter, setAdapter] = useState<ScanInputAdapter | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerType, setScannerType] = useState<'webcam' | 'hid' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    (code: string) => {
      const result = parseQRCode(code);
      setLastRaw(code);
      setLastScanAt(Date.now());
      setLastScan(result);
      setError(null);

      // Call external handler if provided
      if (onScan) {
        onScan(result);
      }
    },
    [onScan]
  );

  const startScanning = useCallback(
    async (newAdapter: ScanInputAdapter) => {
      // Stop existing adapter if any
      if (adapter && adapter.isActive()) {
        await adapter.stop();
      }

      try {
        newAdapter.onScan(handleScan);
        await newAdapter.start();
        setAdapter(newAdapter);
        setIsScanning(true);
        setScannerType(newAdapter.getType());
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start scanner';
        setError(message);
        console.error('Scanner start error:', err);
      }
    },
    [adapter, handleScan]
  );

  const stopScanning = useCallback(async () => {
    if (adapter && adapter.isActive()) {
      await adapter.stop();
    }
    setAdapter(null);
    setIsScanning(false);
    setScannerType(null);
  }, [adapter]);

  const emitScan = useCallback(
    (code: string) => {
      handleScan(code);
    },
    [handleScan]
  );

  const clearLastScan = useCallback(() => {
    setLastScan(null);
    setLastRaw(null);
    setLastScanAt(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (adapter && adapter.isActive()) {
        adapter.stop();
      }
    };
  }, [adapter]);

  return (
    <ScannerContext.Provider
      value={{
        lastScan,
        lastRaw,
        lastScanAt,
        isScanning,
        scannerType,
        startScanning,
        stopScanning,
        emitScan,
        clearLastScan,
        error,
      }}
    >
      {children}
    </ScannerContext.Provider>
  );
}

export function useScanner() {
  const context = useContext(ScannerContext);
  if (!context) {
    throw new Error('useScanner must be used within ScannerProvider');
  }
  return context;
}
