'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  error?: string | null;
}

export function PhoneInput({
  value,
  onChange,
  onComplete,
  autoFocus = true,
  error,
}: PhoneInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleInput = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    // Update value
    const newValue = value.slice(0, index) + digit + value.slice(index + 1);
    onChange(newValue.slice(0, 4));

    // Move to next input
    if (index < 3 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newValue.length === 4 && onComplete) {
      onComplete(newValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (value[index]) {
        // Clear current digit
        const newValue = value.slice(0, index) + '' + value.slice(index + 1);
        onChange(newValue);
      } else if (index > 0) {
        // Move to previous input
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  return (
    <div className="text-center">
      <div className="flex justify-center gap-3 mb-4">
        {[0, 1, 2, 3].map((index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={cn(
              'w-16 h-20 text-4xl text-center font-bold rounded-xl border-2',
              'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
              error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-white'
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <p className="text-gray-500 text-sm mt-2">
        휴대폰 번호 뒷 4자리를 입력해주세요
      </p>
    </div>
  );
}
