import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.env.SEED_EMAIL || "test@gmail.com";
const PASSWORD = process.env.SEED_PASSWORD;

if (!PASSWORD) {
  console.error("Brak SEED_PASSWORD env var");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});

if (authErr || !auth.user) {
  console.error("Login failed:", authErr?.message);
  process.exit(1);
}

console.log(`OK login: ${auth.user.email} (${auth.user.id})`);

const entries = JSON.parse(fs.readFileSync("scripts/.seed-embedded.json", "utf8"));
console.log(`Loaded ${entries.length} entries`);

let inserted = 0;
let skipped = 0;
const batchSize = 10;

for (let i = 0; i < entries.length; i += batchSize) {
  const batch = entries.slice(i, i + batchSize);
  const rows = batch.map((e) => ({
    id: crypto.randomUUID(),
    user_id: auth.user.id,
    date: new Date(e.date).toISOString(),
    content: `<p>${e.text.replace(/'/g, "&#39;").replace(/\n/g, "</p><p>")}</p>`,
    content_text: e.text,
    title: e.title ?? null,
    embedding: e.embedding,
  }));

  const { error } = await supabase.from("entries").insert(rows);
  if (error) {
    console.error(`Batch ${Math.floor(i/batchSize)+1}: ${error.message}`);
    skipped += batch.length;
  } else {
    inserted += batch.length;
    process.stdout.write(`✓ Batch ${Math.floor(i/batchSize)+1}/${Math.ceil(entries.length/batchSize)} (${inserted} total)\r`);
  }
}

console.log(`\n✅ Inserted: ${inserted}, Skipped: ${skipped}`);
