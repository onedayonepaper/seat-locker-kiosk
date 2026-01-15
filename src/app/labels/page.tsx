'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAppState, useSettings } from '@/hooks/useAppState';
import { generateSeatQRValue, generateLockerQRValue } from '@/lib/qr-parser';
import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

type LabelType = 'seat' | 'locker' | 'all';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

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
            width: 200,
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
  }, [labels.map(l => l.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">QR 라벨 출력</h1>
        <button
          onClick={handlePrint}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors print:hidden"
        >
          🖨️ 인쇄하기
        </button>
      </div>

      {/* Controls - hidden when printing */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 print:hidden">
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

          {/* Selection controls */}
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            전체 선택
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            선택 해제
          </button>

          <span className="text-gray-500 ml-auto">
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
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2"
      >
        {labels
          .filter((label) => selectedIds.length === 0 || selectedIds.includes(label.id))
          .map((label) => (
            <div
              key={`${label.type}-${label.id}`}
              className="bg-white border-2 border-gray-200 rounded-xl p-4 text-center print:border print:rounded-lg print:p-2"
            >
              {qrDataUrls[label.id] ? (
                <img
                  src={qrDataUrls[label.id]}
                  alt={`QR Code for ${label.displayName}`}
                  className="w-32 h-32 mx-auto print:w-24 print:h-24"
                />
              ) : (
                <div className="w-32 h-32 mx-auto bg-gray-100 animate-pulse rounded-lg print:w-24 print:h-24" />
              )}
              <div className="mt-3 print:mt-2">
                <div className="font-bold text-lg text-gray-900 print:text-sm">
                  {label.displayName}
                </div>
                <div className="text-xs text-gray-400 mt-1">{label.qrValue}</div>
              </div>
            </div>
          ))}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:grid-cols-3,
          .print\\:grid-cols-3 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
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
