'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

type Role = 'ADMIN' | 'STAFF';

interface RoleContextValue {
  role: Role;
  isLoading: boolean;
  isAuthenticated: boolean;
  setRole: (role: Role) => void;
  requestAdmin: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    role: authRole,
    isLoading,
    login,
    logout: authLogout,
  } = useAuth();

  // Map auth state to role - default to STAFF if not authenticated
  const role: Role = isAuthenticated && authRole ? authRole : 'STAFF';

  const setRole = async (next: Role) => {
    if (next === 'ADMIN' && !isAuthenticated) {
      // Need to login first
      await requestAdmin();
    } else if (next === 'STAFF' && isAuthenticated) {
      // Logout
      await authLogout();
    }
  };

  const requestAdmin = async (): Promise<boolean> => {
    const passcode = window.prompt('관리자 비밀번호를 입력하세요');
    if (!passcode) return false;

    try {
      await login(passcode);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인에 실패했습니다';
      window.alert(message === 'Invalid passcode' ? '비밀번호가 올바르지 않습니다' : message);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value = useMemo(
    () => ({
      role,
      isLoading,
      isAuthenticated,
      setRole,
      requestAdmin,
      logout,
    }),
    [role, isLoading, isAuthenticated]
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
