'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AuthState {
  isAuthenticated: boolean;
  role: 'ADMIN' | 'STAFF' | null;
  expiresAt: string | null;
}

interface LoginResponse {
  success: boolean;
  data?: {
    role: 'ADMIN' | 'STAFF';
    message: string;
  };
  error?: string;
}

interface AuthResponse {
  success: boolean;
  data?: AuthState;
  error?: string;
}

/**
 * Hook for managing authentication state using React Query
 * Fetches auth state from server and provides login/logout mutations
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // Query current auth state
  const {
    data: authState,
    isLoading,
    error,
  } = useQuery<AuthState>({
    queryKey: ['auth'],
    queryFn: async (): Promise<AuthState> => {
      try {
        const response = await fetch('/api/auth/me');
        const result: AuthResponse = await response.json();

        if (!result.success || !result.data) {
          return { isAuthenticated: false, role: null, expiresAt: null };
        }

        return result.data;
      } catch {
        return { isAuthenticated: false, role: null, expiresAt: null };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (passcode: string): Promise<'ADMIN' | 'STAFF'> => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      const result: LoginResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Login failed');
      }

      return result.data?.role || 'ADMIN';
    },
    onSuccess: () => {
      // Invalidate and refetch auth state
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Logout failed');
      }
    },
    onSuccess: () => {
      // Clear auth state
      queryClient.setQueryData(['auth'], {
        isAuthenticated: false,
        role: null,
        expiresAt: null,
      });
    },
  });

  return {
    // Auth state
    isAuthenticated: authState?.isAuthenticated ?? false,
    role: authState?.role ?? null,
    expiresAt: authState?.expiresAt ?? null,
    isLoading,
    error,

    // Actions
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,

    // Mutation states
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    logoutError: logoutMutation.error,
  };
}
