'use client';

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { ScanInputAdapter, ScanCallback, WebcamScannerConfig } from './types';

/**
 * Webcam-based QR/barcode scanner using html5-qrcode library
 * Works with browser getUserMedia API for camera access
 */
export class WebcamScannerAdapter implements ScanInputAdapter {
  private scanner: Html5Qrcode | null = null;
  private callback: ScanCallback | null = null;
  private active = false;
  private config: Required<WebcamScannerConfig>;
  private lastScanTime = 0;
  private readonly SCAN_COOLDOWN = 2000; // 2 seconds between scans to prevent duplicates

  constructor(config: WebcamScannerConfig) {
    this.config = {
      elementId: config.elementId,
      facingMode: config.facingMode || 'environment',
      cameraId: config.cameraId,
      fps: config.fps || 10,
      qrboxSize: config.qrboxSize || 250,
      aspectRatio: config.aspectRatio || 1.0,
    };
  }

  async start(): Promise<void> {
    if (this.active) {
      console.warn('WebcamScanner already active');
      return;
    }

    try {
      this.scanner = new Html5Qrcode(this.config.elementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
        ],
        verbose: false,
      });

      const cameraConfig = this.config.cameraId
        ? { deviceId: { exact: this.config.cameraId } }
        : { facingMode: this.config.facingMode };

      await this.scanner.start(
        cameraConfig,
        {
          fps: this.config.fps,
          qrbox: {
            width: this.config.qrboxSize,
            height: this.config.qrboxSize
          },
          aspectRatio: this.config.aspectRatio,
        },
        (decodedText) => this.handleScan(decodedText),
        () => {} // Ignore scan errors (no QR in frame)
      );

      this.active = true;
      console.log('WebcamScanner started');
    } catch (error) {
      console.error('Failed to start WebcamScanner:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.active || !this.scanner) {
      return;
    }

    try {
      await this.scanner.stop();
      this.scanner.clear();
      this.scanner = null;
      this.active = false;
      console.log('WebcamScanner stopped');
    } catch (error) {
      console.error('Error stopping WebcamScanner:', error);
      // Force cleanup even if stop fails
      this.scanner = null;
      this.active = false;
    }
  }

  private handleScan(code: string): void {
    const now = Date.now();

    // Prevent duplicate scans within cooldown period
    if (now - this.lastScanTime < this.SCAN_COOLDOWN) {
      return;
    }

    this.lastScanTime = now;

    if (this.callback) {
      this.callback(code);
    }
  }

  onScan(callback: ScanCallback): void {
    this.callback = callback;
  }

  isActive(): boolean {
    return this.active;
  }

  getType(): 'webcam' {
    return 'webcam';
  }

  /**
   * Get list of available cameras
   */
  static async getCameras(): Promise<{ id: string; label: string }[]> {
    try {
      const devices = await Html5Qrcode.getCameras();
      return devices.map((d) => ({ id: d.id, label: d.label }));
    } catch (error) {
      console.error('Failed to get cameras:', error);
      return [];
    }
  }
}
