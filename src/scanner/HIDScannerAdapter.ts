'use client';

import type { ScanInputAdapter, ScanCallback, HIDScannerConfig } from './types';

/**
 * HID Barcode Scanner Adapter
 *
 * HID (Human Interface Device) barcode scanners work like keyboards,
 * sending characters rapidly followed by Enter. This adapter:
 * 1. Buffers rapid keystrokes
 * 2. Detects Enter key as scan completion
 * 3. Filters out normal typing (slow keystrokes)
 */
export class HIDScannerAdapter implements ScanInputAdapter {
  private callback: ScanCallback | null = null;
  private active = false;
  private buffer = '';
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private config: Required<HIDScannerConfig>;

  constructor(config: HIDScannerConfig = {}) {
    this.config = {
      scanTimeout: config.scanTimeout || 100, // 100ms between keystrokes
      minCodeLength: config.minCodeLength || 4, // Minimum 4 characters for valid scan
      endChar: config.endChar || 'Enter',
    };
  }

  async start(): Promise<void> {
    if (this.active) {
      console.warn('HIDScanner already active');
      return;
    }

    if (typeof window === 'undefined') {
      throw new Error('HIDScannerAdapter requires a browser environment');
    }

    window.addEventListener('keydown', this.handleKeyDown);
    this.active = true;
    console.log('HIDScanner started');
  }

  async stop(): Promise<void> {
    if (!this.active) {
      return;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
    }

    this.clearBuffer();
    this.active = false;
    console.log('HIDScanner stopped');
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Skip if focus is on an input element (allow normal typing)
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Reset timeout on each keystroke
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Check for scan completion (Enter key)
    if (event.key === this.config.endChar && this.buffer.length > 0) {
      event.preventDefault();
      this.emitScan();
      return;
    }

    // Only accept printable characters (length === 1)
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.buffer += event.key;

      // Set timeout to clear buffer if no more input
      // (helps filter out accidental keystrokes)
      this.timeout = setTimeout(() => {
        if (this.buffer.length >= this.config.minCodeLength) {
          // If buffer has enough characters, treat as scan even without Enter
          this.emitScan();
        } else {
          this.clearBuffer();
        }
      }, this.config.scanTimeout);
    }
  };

  private emitScan(): void {
    if (this.callback && this.buffer.length >= this.config.minCodeLength) {
      console.log('HID scan detected:', this.buffer);
      this.callback(this.buffer);
    }
    this.clearBuffer();
  }

  private clearBuffer(): void {
    this.buffer = '';
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  onScan(callback: ScanCallback): void {
    this.callback = callback;
  }

  isActive(): boolean {
    return this.active;
  }

  getType(): 'hid' {
    return 'hid';
  }

  /**
   * Get current buffer contents (for debugging)
   */
  getBuffer(): string {
    return this.buffer;
  }
}
