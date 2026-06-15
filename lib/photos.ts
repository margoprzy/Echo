import { supabase } from "./supabase";

const BUCKET = "entry-photos";
const SIGNED_URL_TTL = 60 * 60; // 1h

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const fromType = file.type.split("/")[1];
  return (fromType ?? "jpg").toLowerCase();
}

function randomSegment(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Wgrywa zdjęcie do bucketu i zwraca jego pełną ścieżkę. */
export async function uploadPhoto(file: File): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    console.error("uploadPhoto: no user");
    return null;
  }
  const path = `${userId}/${randomSegment()}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) {
    console.error("uploadPhoto failed", error);
    return null;
  }
  return path;
}

/** Wgrywa wiele zdjęć (równolegle) i zwraca listę poprawnych ścieżek. */
export async function uploadPhotos(files: File[]): Promise<string[]> {
  const results = await Promise.all(files.map(uploadPhoto));
  return results.filter((p): p is string => !!p);
}

/** Mapuje listę ścieżek na podpisane URL-e (TTL 1h). */
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  if (error || !data) {
    console.error("getSignedUrls failed", error);
    return {};
  }
  const map: Record<string, string> = {};
  for (const row of data) {
    if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
  }
  return map;
}

/** Zwraca podpisane URL-e w tej samej kolejności co podane ścieżki (puste przy błędzie). */
export async function getSignedUrlsOrdered(paths: string[]): Promise<string[]> {
  const map = await getSignedUrls(paths);
  return paths.map((p) => map[p]).filter(Boolean);
}

/** Usuwa fizyczny plik z bucketu (po wykasowaniu wpisu lub usunięciu zdjęcia w edycji). */
export async function deletePhotos(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error("deletePhotos failed", error);
}
