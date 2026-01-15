'use client';

import { useEffect, useRef, useState } from 'react';
import { useScanner } from './ScannerProvider';
import { cn } from '@/lib/utils';

interface HIDScannerInputProps {
  className?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

export function HIDScannerInput({
  className,
  autoFocus = true,
  placeholder = '예: SEAT:A1 또는 LOCKER:001',
}: HIDScannerInputProps) {
  const { emitScan, clearLastScan } = useScanner();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    emitScan(trimmed);
    setValue('');
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-bold text-gray-900">스캐너 입력</h3>
        <p className="text-gray-600">
          입력창에 스캔 결과가 자동으로 입력됩니다
        </p>
      </div>

      <div className="flex gap-3">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className={cn(
            'flex-1 px-4 py-4 text-xl font-semibold rounded-xl border-2',
            'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
          )}
        />
        <button
          type="button"
          onClick={handleSubmit}
          className="px-6 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>

      <div className="flex justify-between text-sm text-gray-500">
        <span>Enter로 확정됩니다</span>
        <button
          type="button"
          onClick={() => {
            setValue('');
            clearLastScan();
            inputRef.current?.focus();
          }}
          className="text-gray-600 hover:text-gray-800"
        >
          입력 지우기
        </button>
      </div>
    </div>
  );
}
