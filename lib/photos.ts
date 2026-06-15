import { supabase } from "./supabase";

const BUCKET = "entry-photos";
const SIGNED_URL_TTL = 60 * 60; // 1h
const MAX_DIM = 1920; // resize dłuższy bok do 1920 px — galeria pokazuje ~400 px szer.
const JPEG_QUALITY = 0.82;
const COMPRESS_THRESHOLD = 300 * 1024; // pliki ≤ 300 KB pomijamy

function randomSegment(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Wczytuje plik jako HTMLImageElement (wspiera HEIC tylko jeśli przeglądarka też). */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Kompresja po stronie klienta: resize dłuższego boku do MAX_DIM i JPEG quality 0.82.
 * Telefonowe 5–8 MB → ~250–500 KB. Jeśli plik już mały albo kompresja zawiedzie, zwraca oryginał.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file;
  if (!file.type.startsWith("image/")) return file;
  try {
    const img = await loadImage(file);
    const longer = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longer > MAX_DIM ? MAX_DIM / longer : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file; // kompresja nic nie dała
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (err) {
    console.warn("compressImage failed, sending original", err);
    return file;
  }
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  const fromType = file.type.split("/")[1];
  return (fromType ?? "jpg").toLowerCase();
}

/** Wgrywa zdjęcie do bucketu (po kompresji) i zwraca jego pełną ścieżkę. */
export async function uploadPhoto(file: File): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    console.error("uploadPhoto: no user");
    return null;
  }
  const compressed = await compressImage(file);
  const path = `${userId}/${randomSegment()}.${extFromFile(compressed)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, compressed, {
    cacheControl: "31536000",
    upsert: false,
    contentType: compressed.type || undefined,
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
