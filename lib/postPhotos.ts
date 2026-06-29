import { supabaseAdmin } from "./supabaseAdmin";

/**
 * Zdjęcia postów Strapi trzymamy w TYM SAMYM prywatnym buckecie Supabase co dziennik
 * (`entry-photos`), pod prefiksem `posts/`. W Strapi zapisujemy tylko ŚCIEŻKĘ; tutaj
 * (po stronie serwera) zamieniamy ścieżki na podpisane URL-e do wyświetlenia.
 * Dzięki temu nic nie ginie przy deployu Strapi (pliki są w Supabase, nie na dysku Railway).
 */

const BUCKET = "entry-photos";
const SIGNED_URL_TTL = 60 * 60; // 1h

function randomSegment(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function extFrom(file: File): string {
  const fromName = file.name?.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5 && /^[a-z0-9]+$/.test(fromName)) return fromName;
  const fromType = file.type?.split("/")[1]?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromType || "jpg";
}

/** Wgrywa pojedyncze zdjęcie posta do bucketu pod `posts/...`. Zwraca ścieżkę albo null. */
export async function uploadPostPhoto(file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const path = `posts/${randomSegment()}.${extFrom(file)}`;
  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || undefined,
      upsert: false,
      cacheControl: "31536000",
    });
  if (error) {
    console.error("uploadPostPhoto failed", error);
    return null;
  }
  return path;
}

/** Mapuje listę ścieżek na podpisane URL-e (TTL 1h). Klucz = ścieżka. */
export async function signedUrlsForPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) {
    console.error("signedUrlsForPaths failed", error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of data) {
    if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
  }
  return map;
}
