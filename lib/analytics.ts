import posthog from "posthog-js";

/**
 * Centralny punkt wysyłania zdarzeń produktowych do PostHog.
 * Bezpieczny: jeśli PostHog nie został zainicjalizowany (brak klucza, SSR),
 * po prostu nic nie robi — nie trzeba zabezpieczać każdego wywołania osobno.
 */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}
