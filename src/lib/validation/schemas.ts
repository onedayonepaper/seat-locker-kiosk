import { z } from 'zod';

// ============================================================
// Common patterns
// ============================================================

// 4-digit phone number tag
export const userTagSchema = z
  .string()
  .regex(/^\d{4}$/, 'Must be exactly 4 digits');

// Seat ID format: A1, B12, etc.
export const seatIdSchema = z
  .string()
  .regex(/^[A-Z]\d{1,2}$/i, 'Invalid seat ID format (e.g., A1, B12)');

// Locker ID format: 001, 032, etc.
export const lockerIdSchema = z
  .string()
  .regex(/^\d{1,3}$/, 'Invalid locker ID format (e.g., 001, 032)');

// UUID format
export const uuidSchema = z.string().uuid('Invalid UUID format');

// ============================================================
// Seat API Schemas
// ============================================================

export const checkInSchema = z.object({
  seatId: seatIdSchema,
  productId: uuidSchema,
  userTag: userTagSchema,
});

export type CheckInInput = z.infer<typeof checkInSchema>;

export const checkOutSchema = z.object({
  seatId: seatIdSchema,
  userTag: userTagSchema.optional(),
  force: z.boolean().optional().default(false),
});

export type CheckOutInput = z.infer<typeof checkOutSchema>;

export const extendSeatSchema = z.object({
  seatId: seatIdSchema,
  productId: uuidSchema,
  userTag: userTagSchema.optional(),
});

export type ExtendSeatInput = z.infer<typeof extendSeatSchema>;

// ============================================================
// Locker API Schemas
// ============================================================

export const lockerAssignSchema = z.object({
  lockerId: lockerIdSchema,
  userTag: userTagSchema,
  linkedSeatSessionId: uuidSchema.optional(),
});

export type LockerAssignInput = z.infer<typeof lockerAssignSchema>;

export const lockerReleaseSchema = z.object({
  lockerId: lockerIdSchema,
  userTag: userTagSchema.optional(),
  force: z.boolean().optional().default(false),
});

export type LockerReleaseInput = z.infer<typeof lockerReleaseSchema>;

// ============================================================
// Product API Schemas
// ============================================================

export const productCreateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  durationMin: z
    .number()
    .int('Duration must be an integer')
    .positive('Duration must be positive')
    .max(1440, 'Duration cannot exceed 24 hours (1440 minutes)'),
  price: z
    .number()
    .int('Price must be an integer')
    .nonnegative('Price cannot be negative'),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1).max(100).optional(),
  durationMin: z.number().int().positive().max(1440).optional(),
  price: z.number().int().nonnegative().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productDeleteSchema = z.object({
  id: uuidSchema,
});

export type ProductDeleteInput = z.infer<typeof productDeleteSchema>;

// ============================================================
// Settings API Schemas
// ============================================================

export const settingsUpdateSchema = z.object({
  qrFormat: z.enum(['LEGACY', 'APP1']).optional(),
  expirationHandling: z.enum(['MANUAL', 'AUTO']).optional(),
  checkoutConfirmRequired: z.boolean().optional(),
  scanMode: z.enum(['AUTO', 'HID_ONLY', 'WEB_ONLY']).optional(),
  logRetentionDays: z.number().int().min(0).max(365).optional(),
  adminPasscode: z
    .string()
    .regex(/^\d{4,8}$/, 'Passcode must be 4-8 digits')
    .optional(),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

export const layoutCreateSchema = z.object({
  type: z.enum(['seats', 'lockers']),
  layout: z.object({
    rows: z.number().int().positive().max(26), // A-Z
    cols: z.number().int().positive().max(99),
  }),
  prefix: z.string().optional(),
});

export type LayoutCreateInput = z.infer<typeof layoutCreateSchema>;

// ============================================================
// Auth API Schemas
// ============================================================

export const loginSchema = z.object({
  passcode: z
    .string()
    .min(4, 'Passcode must be at least 4 characters')
    .max(8, 'Passcode must be 8 characters or less'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================
// Scan API Schemas
// ============================================================

export const scanResolveSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
});

export type ScanResolveInput = z.infer<typeof scanResolveSchema>;

// ============================================================
// Log API Schemas (query params)
// ============================================================

export const logsQuerySchema = z.object({
  type: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).optional().default(100),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type LogsQueryInput = z.infer<typeof logsQuerySchema>;
