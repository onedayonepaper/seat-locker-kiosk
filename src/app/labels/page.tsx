'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useAppState, useSettings } from '@/hooks/useAppState';
import { generateSeatQRValue, generateLockerQRValue } from '@/lib/qr-parser';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

type LabelType = 'seat' | 'locker' | 'all';
type LabelSize = 'small' | 'medium' | 'large';

const LABEL_SIZES = {
  small: { qr: 80, card: 'w-28', print: 'print:w-20 print:h-20' },
  medium: { qr: 150, card: 'w-40', print: 'print:w-28 print:h-28' },
  large: { qr: 200, card: 'w-52', print: 'print:w-36 print:h-36' },
};

interface LabelData {
  id: string;
  type: 'SEAT' | 'LOCKER';
  qrValue: string;
  displayName: string;
}

function LabelsContent() {
  const { data, isLoading } = useAppState(0); // No polling needed
  const { data: settings } = useSettings();
  const [labelType, setLabelType] = useState<LabelType>('seat');
  const [labelSize, setLabelSize] = useState<LabelSize>('medium');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  const sizeConfig = LABEL_SIZES[labelSize];

  // Generate label data based on selection
  const labels: LabelData[] = [];

  if (data) {
    if (labelType === 'seat' || labelType === 'all') {
      data.seats.forEach((seat) => {
        if (labelType === 'all' || selectedIds.length === 0 || selectedIds.includes(seat.id)) {
          labels.push({
            id: seat.id,
            type: 'SEAT',
            qrValue: generateSeatQRValue(seat.id, settings?.qrFormat),
            displayName: `좌석 ${seat.id}`,
          });
        }
      });
    }

    if (labelType === 'locker' || labelType === 'all') {
      data.lockers.forEach((locker) => {
        if (labelType === 'all' || selectedIds.length === 0 || selectedIds.includes(locker.id)) {
          labels.push({
            id: locker.id,
            type: 'LOCKER',
            qrValue: generateLockerQRValue(locker.id, settings?.qrFormat),
            displayName: `락커 ${parseInt(locker.id)}번`,
          });
        }
      });
    }
  }

  // Generate QR codes
  useEffect(() => {
    const generateQRCodes = async () => {
      const urls: Record<string, string> = {};
      for (const label of labels) {
        try {
          urls[label.id] = await QRCode.toDataURL(label.qrValue, {
            width: sizeConfig.qr * 2, // 2x for retina
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          });
        } catch (err) {
          console.error(`Failed to generate QR for ${label.id}:`, err);
        }
      }
      setQrDataUrls(urls);
    };

    if (labels.length > 0) {
      generateQRCodes();
    }
  }, [labels.map(l => l.id).join(','), sizeConfig.qr]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = () => {
    window.print();
  };

  const handleSelectAll = () => {
    if (data) {
      if (labelType === 'seat') {
        setSelectedIds(data.seats.map((s) => s.id));
      } else if (labelType === 'locker') {
        setSelectedIds(data.lockers.map((l) => l.id));
      } else {
        setSelectedIds([
          ...data.seats.map((s) => s.id),
          ...data.lockers.map((l) => l.id),
        ]);
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 print:hidden">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span className="text-xl">←</span>
              <span>홈</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-bold text-gray-900">QR 라벨 출력</h1>
          </div>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>인쇄하기</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

      {/* Controls - hidden when printing */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 print:hidden">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Label type tabs */}
          <div className="flex gap-2">
            {[
              { value: 'seat', label: '좌석' },
              { value: 'locker', label: '락커' },
              { value: 'all', label: '전체' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setLabelType(tab.value as LabelType);
                  setSelectedIds([]);
                }}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  labelType === tab.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Label size */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">크기:</span>
            <div className="flex gap-1">
              {[
                { value: 'small', label: '소' },
                { value: 'medium', label: '중' },
                { value: 'large', label: '대' },
              ].map((size) => (
                <button
                  key={size.value}
                  onClick={() => setLabelSize(size.value as LabelSize)}
                  className={cn(
                    'px-3 py-1 rounded text-sm font-medium transition-colors',
                    labelSize === size.value
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Selection controls */}
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
          >
            전체 선택
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            선택 해제
          </button>

          <span className="text-gray-500 ml-auto text-sm">
            {selectedIds.length > 0
              ? `${selectedIds.length}개 선택됨`
              : `${labels.length}개 라벨`}
          </span>
        </div>

        {/* Item selection grid */}
        {labelType !== 'all' && (
          <div className="mt-6 flex flex-wrap gap-2">
            {labelType === 'seat' &&
              data?.seats.map((seat) => (
                <button
                  key={seat.id}
                  onClick={() => toggleSelect(seat.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 transition-colors',
                    selectedIds.includes(seat.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {seat.id}
                </button>
              ))}
            {labelType === 'locker' &&
              data?.lockers.map((locker) => (
                <button
                  key={locker.id}
                  onClick={() => toggleSelect(locker.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg border-2 transition-colors',
                    selectedIds.includes(locker.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  {parseInt(locker.id)}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Preview / Print area */}
      <div
        ref={printRef}
        id="print-area"
        className={cn(
          "grid gap-4",
          labelSize === 'small' && "grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
          labelSize === 'medium' && "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
          labelSize === 'large' && "grid-cols-2 md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {labels
          .filter((label) => selectedIds.length === 0 || selectedIds.includes(label.id))
          .map((label) => (
            <div
              key={`${label.type}-${label.id}`}
              className={cn(
                "bg-white border border-gray-200 rounded-xl p-4 text-center flex flex-col items-center",
                "print:border-gray-300 print:rounded-lg print:p-3 print:break-inside-avoid"
              )}
            >
              {qrDataUrls[label.id] ? (
                <img
                  src={qrDataUrls[label.id]}
                  alt={`QR Code for ${label.displayName}`}
                  style={{ width: sizeConfig.qr, height: sizeConfig.qr }}
                  className="print:w-auto print:h-auto"
                />
              ) : (
                <div
                  style={{ width: sizeConfig.qr, height: sizeConfig.qr }}
                  className="bg-gray-100 animate-pulse rounded-lg"
                />
              )}
              <div className="mt-3 print:mt-2">
                <div className={cn(
                  "font-bold text-gray-900",
                  labelSize === 'small' && "text-sm",
                  labelSize === 'medium' && "text-base",
                  labelSize === 'large' && "text-lg",
                )}>
                  {label.displayName}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-mono">{label.qrValue}</div>
              </div>
            </div>
          ))}
      </div>

      {labels.filter((label) => selectedIds.length === 0 || selectedIds.includes(label.id)).length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p>선택된 라벨이 없습니다.</p>
          <p className="text-sm mt-2">위에서 항목을 선택하거나 &apos;전체 선택&apos;을 클릭하세요.</p>
        </div>
      )}

      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body > *:not(#print-area):not(:has(#print-area)) {
            display: none !important;
          }
          header, .print\\:hidden {
            display: none !important;
          }
          #print-area {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            padding: 0;
          }
          #print-area > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}

export default function LabelsPage() {
  return (
    <Providers>
      <LabelsContent />
    </Providers>
  );
}
