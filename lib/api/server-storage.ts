import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";

/**
 * Klient Supabase z kluczem serwisowym (SUPABASE_SECRET_KEY).
 * Używany tylko po stronie serwera do uploadów zdjęć z REST/MCP (omijamy RLS,
 * ale autoryzację robimy wcześniej przez token API).
 */

const BUCKET = "entry-photos";
let cached: SupabaseClient | null = null;

function admin(): SupabaseClient {
  if (cached) return cached;
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!url || !key) throw new Error("missing_supabase_secret");
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** Wyciąga (contentType, bytes) z data URL albo zwraca null. */
function decodeDataUrl(input: string): { contentType: string; bytes: Uint8Array } | null {
  const m = input.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  try {
    const bytes = Buffer.from(m[2], "base64");
    return { contentType: m[1], bytes: new Uint8Array(bytes) };
  } catch {
    return null;
  }
}

function extFromContentType(ct: string): string {
  const sub = ct.split("/")[1] ?? "jpg";
  return sub.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function randomSegment(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Wgrywa listę zdjęć (data URL-e) do bucketu pod prefiksem `{userId}/...`.
 * Zwraca listę ścieżek (pomija te, których nie udało się zdekodować).
 */
export async function uploadApiPhotos(userId: string, photos: string[]): Promise<string[]> {
  if (!photos.length) return [];
  const client = admin();
  const paths: string[] = [];
  for (const raw of photos) {
    const decoded = decodeDataUrl(raw);
    if (!decoded) continue;
    const path = `${userId}/${randomSegment()}.${extFromContentType(decoded.contentType)}`;
    const { error } = await client.storage.from(BUCKET).upload(path, decoded.bytes, {
      contentType: decoded.contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) {
      console.error("uploadApiPhotos failed", error);
      continue;
    }
    paths.push(path);
  }
  return paths;
}

/** Resolves token hash → user_id przez api_whoami (RPC SECURITY DEFINER). */
export async function resolveUserId(
  client: SupabaseClient,
  tokenHash: string
): Promise<string | null> {
  const { data, error } = await client.rpc("api_whoami", { p_token_hash: tokenHash });
  if (error || !data) return null;
  return data as string;
}
