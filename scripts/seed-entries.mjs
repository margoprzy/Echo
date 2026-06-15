#!/usr/bin/env node

/**
 * Seedowanie ~200 spójnych wpisów dla konta test@gmail.com (3 lata: 2023-06-12 → 2026-06-12).
 *
 * Fazy:
 * 1. Generacja treści (xAI Grok, jeśli brak .seed-entries.json)
 * 2. Embeddingi OpenAI (jeśli brak .seed-embedded.json)
 * 3. Insert wsadowy do bazy (execute_sql MCP)
 * 4. (Opcja) Backfill istniejących wpisów
 *
 * Uruchomienie:
 *   node scripts/seed-entries.mjs
 *   node scripts/seed-entries.mjs --backfill
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const SEED_ENTRIES_FILE = path.join(__dirname, ".seed-entries.json");
const SEED_EMBEDDED_FILE = path.join(__dirname, ".seed-embedded.json");

const TARGET_USER_ID = "4798c011-4e38-40c0-917b-24c8f30963b3";
const START_DATE = new Date("2023-06-12");
const END_DATE = new Date("2026-06-12");
const TARGET_COUNT = 200;

// --- Config z env (lub uproszczone defaults na dev) ---
function getEnv(name) {
  return process.env[name] || "";
}

// --- Fase 1: Generacja treści (Grok) ---
async function generateEntries() {
  if (fs.existsSync(SEED_ENTRIES_FILE)) {
    console.log(`✓ Wczytuję istniejące wpisy z ${SEED_ENTRIES_FILE}`);
    const data = JSON.parse(fs.readFileSync(SEED_ENTRIES_FILE, "utf8"));
    console.log(`  Loaded ${data.length} entries`);
    return data;
  }

  const xaiKey = getEnv("XAI_API_KEY");
  if (!xaiKey) throw new Error("Brak XAI_API_KEY");

  console.log(`📝 Generuję ~${TARGET_COUNT} wpisów za xAI Grok...`);
  const entries = [];
  const now = new Date();
  const spanMs = END_DATE.getTime() - START_DATE.getTime();

  const batchSize = 25;
  const batchCount = Math.ceil(TARGET_COUNT / batchSize);

  for (let b = 0; b < batchCount; b++) {
    const batchNum = b + 1;
    const count = b === batchCount - 1 ? TARGET_COUNT % batchSize || batchSize : batchSize;

    console.log(`  Batch ${batchNum}/${batchCount} (${count} wpisów)...`);

    const prompt = `Wygeneruj dokładnie ${count} wpisów do dziennika dla jednej fikcyjnej osoby (30-letnia, praca biurowa, związek, bliskie relacje, hobby). Wpisy rozłożone losowo na trzyletnią oś czasową (2023-06-12 do 2026-06-12), różnych długości (3-20 linii). Powracające wątki: melancholia jesienią/listopad, stres w deadline'y, radość z relacji, lęk niedzielny, refleksje o zdrowiu. Format JSON:
[
  { "date": "YYYY-MM-DDTHH:MM:SSZ", "title": "opcjonalny tytuł" lub null, "text": "treść po polsku, bez HTML" },
  ...
]
Zwróć TYLKO JSON, bez objaśnień.`;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${xaiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Grok ${res.status}: ${err.slice(0, 300)}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "";
    const match = content.match(/\[\s*{[\s\S]*}\s*\]/);
    if (!match) throw new Error(`Nie znaleziono JSON w odpowiedzi Grok (batch ${batchNum})`);

    const batch = JSON.parse(match[0]);
    entries.push(...batch);
  }

  console.log(`✓ Wygenerowałem ${entries.length} wpisów`);
  fs.writeFileSync(SEED_ENTRIES_FILE, JSON.stringify(entries, null, 2));
  return entries;
}

// --- Fase 2: Embeddingi (OpenAI) ---
async function addEmbeddings(entries) {
  if (fs.existsSync(SEED_EMBEDDED_FILE)) {
    console.log(`✓ Wczytuję embeddingi z ${SEED_EMBEDDED_FILE}`);
    const data = JSON.parse(fs.readFileSync(SEED_EMBEDDED_FILE, "utf8"));
    return data;
  }

  const openaiKey = getEnv("OPENAI_API_KEY");
  if (!openaiKey) throw new Error("Brak OPENAI_API_KEY");

  console.log(`🔢 Liczę embeddingi (OpenAI text-embedding-3-small)...`);

  const embedded = [];
  const batchSize = 100;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const texts = batch.map((e) => e.text.slice(0, 8000));

    console.log(`  Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(entries.length / batchSize)}`);

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
    }

    const json = await res.json();
    const vecs = json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);

    batch.forEach((entry, idx) => {
      embedded.push({
        ...entry,
        embedding: vecs[idx],
      });
    });
  }

  console.log(`✓ Policzyłem embeddingi dla ${embedded.length} wpisów`);
  fs.writeFileSync(SEED_EMBEDDED_FILE, JSON.stringify(embedded, null, 2));
  return embedded;
}

// --- Fase 3: Insert wsadowy (SQL ready to copy-paste) ---
async function insertToDB(entries) {
  console.log(`📤 Generuję SQL do insercji (~${entries.length} wpisów)...`);

  const batchSize = 50;
  const sqlFile = path.join(__dirname, ".seed-insert.sql");
  const sqlLines = [];

  sqlLines.push("-- Seed ~200 wpisów dla test@gmail.com z embeddingami");
  sqlLines.push("-- Uruchom w: https://supabase.com/dashboard → SQL Editor");
  sqlLines.push("");

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(entries.length / batchSize);

    sqlLines.push(`-- Batch ${batchNum}/${totalBatches}`);

    const values = batch
      .map((e) => {
        const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        const contentHtml = plainTextToHtml(e.text);
        const contentText = e.text;
        const embeddingLit = `'[${e.embedding.join(",")}]'::extensions.vector(1536)`;
        const date = new Date(e.date).toISOString();
        const title = e.title ? `'${e.title.replace(/'/g, "''")}'` : "null";
        const htmlEscaped = `'${contentHtml.replace(/'/g, "''")}'`;
        const textEscaped = `'${contentText.replace(/'/g, "''")}'`;

        return `('${id}', '${TARGET_USER_ID}', '${date}', ${htmlEscaped}, ${textEscaped}, ${title}, null, now(), now(), ${embeddingLit})`;
      })
      .join(",\n    ");

    const sql = `insert into public.entries
  (id, user_id, date, content, content_text, title, photo_url, created_at, updated_at, embedding)
values
    ${values}
on conflict (id) do nothing;
`;
    sqlLines.push(sql);
    sqlLines.push("");
  }

  fs.writeFileSync(sqlFile, sqlLines.join("\n"));
  console.log(`✓ SQL wygenerowany: ${sqlFile}`);
  console.log(`  Skopiuj treść do: https://supabase.com/dashboard → SQL Editor i uruchom.`);
}

// --- Utils ---
function plainTextToHtml(text) {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>").replace(/'/g, "&#39;")}</p>`)
    .join("");
}

// --- Main ---
async function main() {
  try {
    console.log("🌱 Seed Echo entries (~200 wpisów, 3 lata)\n");

    const entries = await generateEntries();
    const embedded = await addEmbeddings(entries);
    await insertToDB(embedded);

    console.log("\n✅ Seed przygotowany!");
    console.log(`   Wpisy: ${SEED_ENTRIES_FILE}`);
    console.log(`   Embeddingi: ${SEED_EMBEDDED_FILE}`);
  } catch (err) {
    console.error("❌ Błąd:", err.message);
    process.exit(1);
  }
}

main();
