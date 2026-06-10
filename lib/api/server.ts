import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Wspólne narzędzia dla publicznego API Echo (route handlers w `app/api/v1`).
 * Uwierzytelnianie: nagłówek `Authorization: Bearer <token>`.
 * Token nie jest nigdzie zapisywany — porównujemy jego SHA-256 z `api_keys.token_hash`.
 */

let cached: SupabaseClient | null = null;

/** Klient Supabase dla serwera (anon key, bez sesji). Woła funkcje SECURITY DEFINER. */
export function db(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return cached;
}

/** SHA-256 (hex) z surowego tokenu — ta sama postać, co zapisana w bazie. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Wyciąga token z nagłówka Authorization (format „Bearer xxx"). */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

/** Odpowiedź JSON z nagłówkami CORS (żeby API dało się wołać też z przeglądarki/agenta). */
export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

/** Ustandaryzowany błąd: { error: { code, message } }. */
export function apiError(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

/** Obsługa preflight CORS. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Sprawdza token i zwraca jego hash gotowy do przekazania funkcjom API.
 * Zwraca `{ tokenHash }` albo gotową odpowiedź błędu 401.
 */
export function requireToken(req: Request): { tokenHash: string } | { response: Response } {
  const token = bearerToken(req);
  if (!token) {
    return {
      response: apiError(
        "missing_token",
        "Brak tokenu. Dodaj nagłówek 'Authorization: Bearer <twój_token>'.",
        401
      ),
    };
  }
  return { tokenHash: hashToken(token) };
}

/** Mapuje błąd z funkcji Postgres na odpowiedź HTTP. Nieważny token → 401. */
export function mapDbError(error: { message?: string; code?: string }): Response {
  const msg = error.message ?? "";
  if (msg.includes("invalid_api_key") || error.code === "28000") {
    return apiError("invalid_token", "Nieprawidłowy lub odwołany token API.", 401);
  }
  return apiError("server_error", "Błąd serwera podczas przetwarzania żądania.", 500);
}

/** Prosty plain-text → HTML (akapity), żeby wpis ładnie wyświetlił się w Echo. */
export function plainTextToHtml(text: string): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return "";
  // Jeśli ktoś przysłał już HTML, zostaw bez zmian.
  if (/<\/?[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
