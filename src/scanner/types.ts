/**
 * Scanner types and interfaces for QR/Barcode scanning abstraction
 * Supports both webcam scanning and HID barcode scanners
 */

export type ScanCallback = (code: string) => void;

/**
 * Base interface for all scanner adapters
 * Both WebcamScannerAdapter and HIDScannerAdapter implement this interface
 */
export interface ScanInputAdapter {
  /** Initialize and start scanning */
  start(): Promise<void>;

  /** Stop scanning and cleanup resources */
  stop(): Promise<void>;

  /** Register callback for scan events */
  onScan(callback: ScanCallback): void;

  /** Check if scanner is currently active */
  isActive(): boolean;

  /** Get adapter type identifier */
  getType(): 'webcam' | 'hid';
}

/**
 * Parsed result from a QR/barcode scan
 */
export interface ScanResult {
  /** Raw scanned string */
  raw: string;
  /** Parsed resource type */
  type: 'SEAT' | 'LOCKER' | 'UNKNOWN';
  /** Parsed resource ID (null if type is UNKNOWN) */
  resourceId: string | null;
}

/**
 * Webcam scanner configuration options
 */
export interface WebcamScannerConfig {
  /** HTML element ID where the scanner will render */
  elementId: string;
  /** Preferred camera facing mode */
  facingMode?: 'environment' | 'user';
  /** Specific camera device ID */
  cameraId?: string;
  /** Frames per second for scanning */
  fps?: number;
  /** Size of the QR scanning box */
  qrboxSize?: number;
  /** Aspect ratio of the scanner view */
  aspectRatio?: number;
}

/**
 * HID scanner configuration options
 */
export interface HIDScannerConfig {
  /** Timeout between keystrokes before buffer is cleared (ms) */
  scanTimeout?: number;
  /** Minimum code length to accept as valid scan */
  minCodeLength?: number;
  /** Character that signals end of scan (usually Enter) */
  endChar?: string;
}
