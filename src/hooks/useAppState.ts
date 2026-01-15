'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AppState,
  AppSettings,
  Seat,
  Locker,
  Product,
  Session,
  EventLog,
} from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Fetch full app state with polling
export function useAppState(refetchInterval = 3000) {
  return useQuery<AppState>({
    queryKey: ['appState'],
    queryFn: async () => {
      const response = await fetch('/api/state');
      const result: ApiResponse<AppState> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch state');
      }
      return result.data;
    },
    refetchInterval,
    staleTime: 2000,
  });
}

// Fetch products only
export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      const result: ApiResponse<Product[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch products');
      }
      return result.data;
    },
  });
}

// Fetch all products (including inactive)
export function useProductsAll() {
  return useQuery<Product[]>({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/products?all=1');
      const result: ApiResponse<Product[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch products');
      }
      return result.data;
    },
  });
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      durationMin: number;
      price: number;
      isDefault?: boolean;
      sortOrder?: number;
    }) => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Create product failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
    },
  });
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      durationMin?: number;
      price?: number;
      isDefault?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    }) => {
      const response = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Update product failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
    },
  });
}

// Deactivate product mutation
export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string }) => {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Deactivate product failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] });
    },
  });
}

// Check-in mutation
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seatId,
      productId,
      userTag,
    }: {
      seatId: string;
      productId: string;
      userTag: string;
    }) => {
      const response = await fetch('/api/seats/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, productId, userTag }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Check-in failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}

// Check-out mutation
export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seatId,
      userTag,
      force,
    }: {
      seatId: string;
      userTag?: string;
      force?: boolean;
    }) => {
      const response = await fetch('/api/seats/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, userTag, force }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Check-out failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}

// Extend session mutation
export function useExtendSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seatId,
      addMinutes,
      productId,
    }: {
      seatId: string;
      addMinutes?: number;
      productId?: string;
    }) => {
      const response = await fetch('/api/seats/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatId, addMinutes, productId }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Extend failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}

// Scan resolve
export function useScanResolve() {
  return useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/scan/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Scan resolve failed');
      }
      return result.data;
    },
  });
}

// Locker assign mutation
export function useLockerAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lockerId,
      userTag,
      linkedSeatSessionId,
    }: {
      lockerId: string;
      userTag: string;
      linkedSeatSessionId?: string;
    }) => {
      const response = await fetch('/api/lockers/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockerId, userTag, linkedSeatSessionId }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Locker assign failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}

// Locker release mutation
export function useLockerRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lockerId,
      userTag,
      force,
    }: {
      lockerId: string;
      userTag?: string;
      force?: boolean;
    }) => {
      const response = await fetch('/api/lockers/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockerId, userTag, force }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Locker release failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}

// Event logs
export function useEventLogs(search?: string, limit = 50) {
  return useQuery<EventLog[]>({
    queryKey: ['eventLogs', { search, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (limit) params.set('limit', String(limit));
      const response = await fetch(`/api/logs?${params.toString()}`);
      const result: ApiResponse<EventLog[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch logs');
      }
      return result.data;
    },
  });
}

// App settings
export function useSettings() {
  return useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      const result: ApiResponse<AppSettings> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch settings');
      }
      return result.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<AppSettings> & { adminPasscode?: string }) => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Update settings failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useApplyLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rowCount: number; colCount: number; lockerCount: number }) => {
      const response = await fetch('/api/settings/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Apply layout failed');
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appState'] });
    },
  });
}
