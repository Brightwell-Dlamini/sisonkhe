/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal camera-based QR scanner using BarcodeDetector if available,
 * falling back to a "type the plate manually" prompt.
 *
 * BarcodeDetector is supported in Chrome/Edge on Android and desktop.
 * iOS Safari doesn't support it yet — for iOS, we suggest manual entry.
 */

"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseQrScannerResult {
  supported: boolean;
  scanning: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  onDetected: (callback: (payload: string) => void) => void;
}

export function useQrScanner(
  externalVideoRef?: RefObject<HTMLVideoElement | null>
): UseQrScannerResult {
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef<((payload: string) => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const has =
      "BarcodeDetector" in window &&
      typeof (window as any).BarcodeDetector === "function";
    setSupported(has);
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  }, [videoRef]);

  const start = useCallback(async () => {
    setError(null);

    if (!supported) {
      setError(
        "Camera scanning is not supported in this browser. Use manual plate entry."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector = (window as any).BarcodeDetector;
      const detector = new Detector({ formats: ["qr_code"] });
      detectorRef.current = detector;

      setScanning(true);

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          if (results && results.length > 0) {
            const raw = results[0].rawValue as string;
            if (raw && callbackRef.current) {
              callbackRef.current(raw);
              stop();
              return;
            }
          }
        } catch {
          // ignore detection errors
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not access camera. Check permissions."
      );
      stop();
    }
  }, [supported, stop, videoRef]);

  const onDetected = useCallback((callback: (payload: string) => void) => {
    callbackRef.current = callback;
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    supported,
    scanning,
    error,
    start,
    stop,
    onDetected,
  };
}
