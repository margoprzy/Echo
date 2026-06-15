import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const QUERIES = [
  "kiedy najczęściej dopada mnie melancholia?",
  "stres w pracy przed deadline",
  "radość z relacji z bliskimi",
  "lęk niedzielny wieczorem",
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const { error: authErr } = await supabase.auth.signInWithPassword({
  email: "test@gmail.com",
  password: "SeedPass123!",
});
if (authErr) { console.error(authErr); process.exit(1); }

for (const query of QUERIES) {
  console.log(`\n🔍 Pytanie: "${query}"`);

  // Embedding pytania
  const embRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: query }),
  });
  const embJson = await embRes.json();
  const embedding = embJson.data[0].embedding;
  const embLit = `[${embedding.join(",")}]`;

  // Hybrid search via search_entries (auth.uid)
  const { data, error } = await supabase.rpc("search_entries", {
    p_query_text: query,
    p_query_embedding: embLit,
    p_limit: 5,
  });

  if (error) {
    console.error(`  ❌ ${error.message}`);
    continue;
  }

  console.log(`  📊 Top ${data.length} powiązanych wpisów:`);
  data.forEach((r, i) => {
    const date = new Date(r.date).toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
    const preview = (r.content_text || "").slice(0, 100).replace(/\n/g, " ");
    console.log(`    ${i+1}. [${date}] score=${r.score.toFixed(4)}`);
    console.log(`       ${preview}...`);
  });
}

console.log("\n✅ Test hybrid search zakończony");
