"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEventLike {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): { new (): SpeechRecognitionLike } | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: { new (): SpeechRecognitionLike };
    webkitSpeechRecognition?: { new (): SpeechRecognitionLike };
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognition {
  isRecording: boolean;
  elapsed: number;
  toast: string | null;
  toggle: () => void;
}

/**
 * Web Speech API (Chrome/Edge) live transcription in pl-PL.
 * Każdy ukończony fragment trafia do `onTranscript`.
 */
export function useSpeechRecognition(
  onTranscript: (text: string) => void
): UseSpeechRecognition {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const userStoppedRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest callback without re-creating recognition handlers.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      userStoppedRef.current = true;
      try {
        recognitionRef.current?.abort();
      } catch {}
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      showToast("Transkrypcja działa w Chrome lub Edge");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "pl-PL";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      const trimmed = finalText.trim();
      if (trimmed) onTranscriptRef.current(trimmed + " ");
    };

    recognition.onerror = (e) => {
      const err = e.error;
      if (err === "not-allowed" || err === "service-not-allowed") {
        userStoppedRef.current = true;
        showToast("Brak dostępu do mikrofonu");
      } else if (err === "audio-capture") {
        userStoppedRef.current = true;
        showToast("Brak mikrofonu");
      } else if (err === "network") {
        userStoppedRef.current = true;
        showToast("Brak połączenia z usługą transkrypcji");
      } else if (err === "no-speech") {
        // ignore — recognizer just paused
      } else if (err && err !== "aborted") {
        userStoppedRef.current = true;
        showToast("Błąd transkrypcji");
      }
    };

    recognition.onend = () => {
      if (userStoppedRef.current) {
        stopTick();
        recognitionRef.current = null;
        setIsRecording(false);
        setElapsed(0);
        userStoppedRef.current = false;
      } else {
        // Chrome auto-stops after silence — restart to keep listening.
        try {
          recognition.start();
        } catch {
          stopTick();
          recognitionRef.current = null;
          setIsRecording(false);
          setElapsed(0);
        }
      }
    };

    try {
      userStoppedRef.current = false;
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch {
      showToast("Nie udało się uruchomić transkrypcji");
    }
  }, [showToast, stopTick]);

  const stop = useCallback(() => {
    userStoppedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  return { isRecording, elapsed, toast, toggle };
}
