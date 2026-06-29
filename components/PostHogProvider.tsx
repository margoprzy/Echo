"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { cleanEnv } from "@/lib/env";

const KEY = cleanEnv(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const HOST = cleanEnv(process.env.NEXT_PUBLIC_POSTHOG_HOST) || "https://eu.i.posthog.com";

// Inicjalizujemy raz, po stronie klienta. Bez klucza nie robimy nic (np. w buildzie/CI).
if (typeof window !== "undefined" && KEY && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    // Nowoczesne, rozsądne domyślne ustawienia (m.in. auto-pageview przy nawigacji SPA).
    defaults: "2025-05-24",
    // Profile osób tylko dla zalogowanych (oszczędza limity, czystsze dane).
    person_profiles: "identified_only",
    // Nagrania sesji (session replay).
    disable_session_recording: false,
    session_recording: {
      // UI/nawigacja/przyciski są widoczne (analiza UX). Maskujemy tylko to, co wrażliwe:
      //  - wszystkie pola formularzy (imię, treść czatu z terapeutą, login),
      maskAllInputs: true,
      //  - treść wpisów i wiadomości — kontenery oznaczone atrybutem data-ph-mask,
      maskTextSelector: "[data-ph-mask]",
      //  - zdjęcia z wpisów — blokowane (placeholder o tych samych wymiarach, układ zostaje).
      blockSelector: "[data-ph-no-capture]",
    },
    // Heatmapy (mapy kliknięć / scrolla).
    capture_heatmaps: true,
    autocapture: true,
    capture_pageleave: true,
  });
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// Hook pomocniczy do identyfikacji / wylogowania użytkownika.
export function usePostHogIdentify(userId?: string | null, email?: string | null) {
  useEffect(() => {
    if (!KEY || typeof window === "undefined") return;
    if (userId) {
      posthog.identify(userId, email ? { email } : undefined);
    }
  }, [userId, email]);
}
