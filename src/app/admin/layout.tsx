'use client';

import { Providers } from '@/components/providers';
import Link from 'next/link';
import { useRole } from '@/components/admin/RoleProvider';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <AdminHeader />

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </Providers>
  );
}

function AdminHeader() {
  const { role, setRole, requestAdmin } = useRole();
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-gray-900">관리자</h1>
            <nav className="flex gap-4">
              <Link
                href="/admin"
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                대시보드
              </Link>
              <Link
                href="/labels"
                className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                QR 라벨
              </Link>
              {role === 'ADMIN' && (
                <Link
                  href="/settings"
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  설정
                </Link>
              )}
              {role === 'ADMIN' && (
                <Link
                  href="/admin/dev"
                  className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  개발 도구
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (role === 'ADMIN') {
                  setRole('STAFF');
                } else {
                  requestAdmin();
                }
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300"
            >
              {role === 'ADMIN' ? '직원 모드' : '관리자 전환'}
            </button>
            <Link
              href="/kiosk"
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              키오스크
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
