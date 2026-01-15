// Status enums
export type SeatStatus = 'AVAILABLE' | 'OCCUPIED' | 'EXPIRED' | 'DISABLED';
export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'DISABLED';
export type SessionStatus = 'ACTIVE' | 'ENDED' | 'EXPIRED';
export type EndedReason = 'CHECKOUT' | 'FORCE_END' | 'EXPIRED' | 'RELEASED';
export type ResourceType = 'SEAT' | 'LOCKER';
export type EventType = 'CHECK_IN' | 'CHECK_OUT' | 'EXTEND' | 'FORCE_END' | 'ASSIGN' | 'RELEASE';
export type ActorRole = 'CUSTOMER' | 'ADMIN';
export type QRFormat = 'LEGACY' | 'APP1';
export type ExpirationHandling = 'MANUAL' | 'AUTO';
export type ScanModePolicy = 'AUTO' | 'HID_ONLY' | 'WEB_ONLY';

// Core entity types
export interface Seat {
  id: string;
  name: string;
  row: string;
  col: number;
  status: SeatStatus;
  currentSessionId: string | null;
  currentSession?: Session | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Locker {
  id: string;
  name: string;
  status: LockerStatus;
  linkedSeatId: string | null;
  currentSessionId: string | null;
  currentSession?: Session | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  userTag: string;
  productId: string | null;
  product?: Product | null;
  startAt: Date;
  endAt: Date | null;
  status: SessionStatus;
  endedReason: EndedReason | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventLog {
  id: string;
  type: EventType;
  payload: string;
  actorRole: ActorRole;
  createdAt: Date;
}

// API Response types
export interface AppState {
  seats: Seat[];
  lockers: Locker[];
  sessions: Session[];
  products: Product[];
}

export interface AppSettings {
  qrFormat: QRFormat;
  expirationHandling: ExpirationHandling;
  checkoutConfirmRequired: boolean;
  scanMode: ScanModePolicy;
  logRetentionDays: number;
}

export interface ScanResolveResponse {
  type: ResourceType | 'UNKNOWN';
  resourceId: string | null;
  resource?: Seat | Locker | null;
  hasActiveSession: boolean;
}

export interface CheckInRequest {
  seatId: string;
  productId: string;
  userTag: string;
}

export interface CheckOutRequest {
  seatId: string;
  userTag: string;
}

export interface ExtendRequest {
  seatId: string;
  addMinutes: number;
}

export interface LockerAssignRequest {
  lockerId: string;
  userTag: string;
  linkedSeatSessionId?: string;
}

export interface LockerReleaseRequest {
  lockerId: string;
  userTag?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
