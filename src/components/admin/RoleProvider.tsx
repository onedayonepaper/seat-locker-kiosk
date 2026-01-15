'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Role = 'ADMIN' | 'STAFF';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  requestAdmin: () => Promise<boolean>;
}

const RoleContext = createContext<RoleContextValue | null>(null);
const STORAGE_KEY = 'seat-locker-role';

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('STAFF');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ADMIN' || stored === 'STAFF') {
      setRoleState(stored);
    }
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const requestAdmin = async () => {
    const passcode = window.prompt('관리자 비밀번호를 입력하세요');
    if (!passcode) return false;
    const response = await fetch('/api/settings/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const result = await response.json();
    if (result?.data?.valid) {
      setRole('ADMIN');
      return true;
    }
    window.alert('비밀번호가 올바르지 않습니다');
    return false;
  };

  const value = useMemo(
    () => ({
      role,
      setRole,
      requestAdmin,
    }),
    [role]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within RoleProvider');
  }
  return context;
}
