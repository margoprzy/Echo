/**
 * Klient Strapi (CMS hostowany na Railway) — używany WYŁĄCZNIE po stronie serwera.
 * Token API trzymamy w STRAPI_API_TOKEN i nigdy nie wysyłamy do przeglądarki;
 * aplikacja rozmawia ze Strapi przez własne route'y (app/api/posts).
 *
 * Zdjęcia NIE trafiają do Media Library Strapi (dysk Railway jest ulotny). W polu
 * `images` (json) trzymamy ścieżki do prywatnego bucketu Supabase Storage; aplikacja
 * generuje podpisane URL-e przy wyświetlaniu (patrz lib/postPhotos.ts).
 *
 * Strapi v5: atrybuty są „spłaszczone" (bez zagnieżdżenia `attributes`).
 */
import { cleanEnv } from "./env";

const STRAPI_URL = cleanEnv(process.env.STRAPI_URL).replace(/\/+$/, "");
const STRAPI_API_TOKEN = cleanEnv(process.env.STRAPI_API_TOKEN);

export function strapiConfigured(): boolean {
  return Boolean(STRAPI_URL && STRAPI_API_TOKEN);
}

/** Reprezentacja posta po stronie serwera (images = ścieżki Supabase Storage). */
export interface Post {
  id: number;
  documentId: string;
  title: string;
  content: string;
  images: string[];
  entryDate: string | null;
  sourceEntryId: string | null;
  createdAt: string;
}

interface StrapiPost {
  id: number;
  documentId: string;
  title?: string;
  content?: string;
  images?: unknown;
  entryDate?: string | null;
  sourceEntryId?: string | null;
  createdAt: string;
}

function toPost(p: StrapiPost): Post {
  return {
    id: p.id,
    documentId: p.documentId,
    title: p.title ?? "",
    content: p.content ?? "",
    images: Array.isArray(p.images) ? (p.images.filter((x) => typeof x === "string") as string[]) : [],
    entryDate: p.entryDate ?? null,
    sourceEntryId: p.sourceEntryId ?? null,
    createdAt: p.createdAt,
  };
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${STRAPI_API_TOKEN}`, ...(extra ?? {}) };
}

export interface PostInput {
  title: string;
  content: string;
  images?: string[];
  entryDate?: string | null;
  sourceEntryId?: string | null;
}

/**
 * Pobiera WSZYSTKIE posty (najnowsze pierwsze), stronicując po 100 — Strapi domyślnie
 * ogranicza stronę do 100 wyników, więc przechodzimy przez kolejne strony.
 */
export async function getPosts(): Promise<Post[]> {
  const all: StrapiPost[] = [];
  let page = 1;
  for (;;) {
    const url = `${STRAPI_URL}/api/posts?sort[0]=entryDate:desc&sort[1]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=100`;
    const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) throw new Error(`Strapi getPosts ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as {
      data: StrapiPost[];
      meta?: { pagination?: { pageCount?: number } };
    };
    all.push(...(body.data ?? []));
    const pageCount = body.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return all.map(toPost);
}

/** Tworzy nowy post. */
export async function createPost(input: PostInput): Promise<Post> {
  const res = await fetch(`${STRAPI_URL}/api/posts`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      data: {
        title: input.title,
        content: input.content,
        images: input.images ?? [],
        entryDate: input.entryDate ?? null,
        sourceEntryId: input.sourceEntryId ?? null,
      },
    }),
  });
  if (!res.ok) throw new Error(`Strapi createPost ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: StrapiPost };
  return toPost(body.data);
}

/** Idempotencja migracji: szuka posta po sourceEntryId (zwraca pierwszy lub null). */
export async function getPostBySourceId(sourceEntryId: string): Promise<Post | null> {
  const url = `${STRAPI_URL}/api/posts?filters[sourceEntryId][$eq]=${encodeURIComponent(
    sourceEntryId
  )}&pagination[pageSize]=1`;
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Strapi getPostBySourceId ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as { data: StrapiPost[] };
  return body.data?.[0] ? toPost(body.data[0]) : null;
}
