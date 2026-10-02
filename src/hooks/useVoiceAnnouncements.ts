/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Text-to-speech announcements for the kiosk. Uses the Web Speech API.
 * Only reads when the tab is visible (kiosks are always visible).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceAnnouncementsResult {
  enabled: boolean;
  supported: boolean;
  speaking: boolean;
  setEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  cancel: () => void;
}

export function useVoiceAnnouncements(
  storageKey: string = "kiosk_voice_enabled"
): UseVoiceAnnouncementsResult {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "true";
  });
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("speechSynthesis" in window);

    // Load voices (async in some browsers)
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voiceRef.current =
          voices.find((v) => v.lang === "en-GB") ??
          voices.find((v) => v.lang.startsWith("en")) ??
          voices[0];
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const setEnabled = useCallback(
    (next: boolean) => {
      setEnabledState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, String(next));
        if (!next) window.speechSynthesis.cancel();
      }
    },
    [storageKey]
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !enabled) return;
      if (typeof window === "undefined") return;

      // Cancel any pending speech — announcements shouldn't queue up
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [supported, enabled]
  );

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { enabled, supported, speaking, setEnabled, speak, cancel };
}
