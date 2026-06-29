/**
 * Jednorazowa migracja wpisów dziennika (Supabase `entries`) do CMS Strapi jako Posty.
 *
 * - Zakres: tylko konto test@gmail.com (user_id poniżej).
 * - Zdjęcia: ŚCIEŻKI z prywatnego bucketu Supabase trafiają do pola `images` (json).
 *   Pliki zostają w Supabase Storage — nic nie ginie przy deployu Strapi.
 * - Niedestrukcyjne: czyta z Supabase, NIE modyfikuje wpisów ani embeddingów.
 * - Idempotentne: pomija wpisy już zmigrowane (po `sourceEntryId`).
 *
 * Uruchom z katalogu echo/:  node scripts/migrate-to-strapi.mjs
 * Wymaga w .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, STRAPI_URL, STRAPI_API_TOKEN
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const USER_ID = "4798c011-4e38-40c0-917b-24c8f30963b3"; // test@gmail.com

const clean = (v) => (v ?? "").replace(/^["']|["']$/g, "").trim();
const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const SUPABASE_KEY = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const STRAPI_URL = clean(process.env.STRAPI_URL).replace(/\/+$/, "");
const STRAPI_TOKEN = clean(process.env.STRAPI_API_TOKEN);

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
if (!STRAPI_URL || !STRAPI_TOKEN) throw new Error("Brak STRAPI_URL / STRAPI_API_TOKEN");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sHeaders = { Authorization: `Bearer ${STRAPI_TOKEN}` };

function deriveTitle(html, date) {
  const text = String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (text) return text.length > 80 ? text.slice(0, 80).trimEnd() + "…" : text;
  try {
    return "Wpis · " + new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
  } catch {
    return "Wpis";
  }
}

async function fetchExistingSourceIds() {
  const ids = new Set();
  let page = 1;
  for (;;) {
    const url = `${STRAPI_URL}/api/posts?fields[0]=sourceEntryId&pagination[page]=${page}&pagination[pageSize]=200`;
    const res = await fetch(url, { headers: sHeaders });
    if (!res.ok) throw new Error(`getPosts ${res.status}: ${await res.text()}`);
    const body = await res.json();
    for (const p of body.data ?? []) if (p.sourceEntryId) ids.add(p.sourceEntryId);
    const pageCount = body.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) break;
    page++;
  }
  return ids;
}

async function createPost(entry) {
  const images = Array.isArray(entry.photo_paths) ? entry.photo_paths.filter((x) => typeof x === "string") : [];
  const res = await fetch(`${STRAPI_URL}/api/posts`, {
    method: "POST",
    headers: { ...sHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: {
        title: deriveTitle(entry.content, entry.date),
        content: entry.content ?? "",
        images,
        entryDate: entry.date,
        sourceEntryId: entry.id,
      },
    }),
  });
  if (!res.ok) throw new Error(`createPost ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log("→ Pobieram wpisy z Supabase (test@gmail.com)…");
  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, date, content, photo_url, photo_paths")
    .eq("user_id", USER_ID)
    .order("date", { ascending: true });
  if (error) throw error;
  console.log(`   znaleziono ${entries.length} wpisów`);

  console.log("→ Sprawdzam, co już jest w Strapi…");
  const existing = await fetchExistingSourceIds();
  console.log(`   już zmigrowane: ${existing.size}`);

  let created = 0,
    skipped = 0,
    failed = 0;
  for (const entry of entries) {
    if (existing.has(entry.id)) {
      skipped++;
      continue;
    }
    try {
      await createPost(entry);
      created++;
      if (created % 25 === 0) console.log(`   …utworzono ${created}`);
    } catch (e) {
      failed++;
      console.error(`   ✗ wpis ${entry.id}:`, String(e).slice(0, 200));
    }
  }

  console.log(`\n✓ Gotowe. Utworzono: ${created}, pominięto (już były): ${skipped}, błędy: ${failed}`);
}

main().catch((e) => {
  console.error("Migracja nie powiodła się:", e);
  process.exit(1);
});
