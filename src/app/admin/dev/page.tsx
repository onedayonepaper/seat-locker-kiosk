'use client';

import { useState } from 'react';
import { useRole } from '@/components/admin/RoleProvider';

const actions = [
  { id: 'createSeatSession', label: '좌석 세션 생성(10분)' },
  { id: 'createLockerSession', label: '락커 세션 생성' },
  { id: 'expireAll', label: '모든 세션 만료 처리' },
  { id: 'addLog', label: '샘플 로그 추가' },
  { id: 'clearLogs', label: '로그 전체 삭제' },
] as const;

export default function AdminDevPage() {
  const { role } = useRole();
  const [message, setMessage] = useState('');

  if (role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">개발 도구</h1>
        <p className="text-gray-600">관리자 모드에서만 접근할 수 있습니다.</p>
      </div>
    );
  }

  const runAction = async (action: string) => {
    setMessage('처리 중...');
    const response = await fetch('/api/dev/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const result = await response.json();
    if (!result.success) {
      setMessage(result.error || '실패했습니다');
      return;
    }
    setMessage('완료되었습니다');
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">개발 도구</h1>
      <p className="text-gray-600">
        개발 환경에서만 동작합니다. 좌석/락커 상태를 빠르게 테스트할 수 있습니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => runAction(action.id)}
            className="px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>

      {message && <div className="text-sm text-gray-600">{message}</div>}
    </div>
  );
}
