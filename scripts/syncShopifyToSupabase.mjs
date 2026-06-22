#!/usr/bin/env node
/**
 * Jednorazowy backfill: pobiera produkty terapeutów z Shopify (Admin API)
 * i upsertuje je do tabeli `therapists` w Supabase (klucz: handle).
 * Uruchomienie: node scripts/syncShopifyToSupabase.mjs
 */
import { createClient } from "@supabase/supabase-js";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

for (const [k, v] of Object.entries({ STORE_DOMAIN, ADMIN_TOKEN, SUPABASE_URL, SUPABASE_KEY })) {
  if (!v) { console.error(`Brak zmiennej: ${k}`); process.exit(1); }
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function fetchProducts() {
  const query = `{
    products(first: 50) {
      nodes {
        id
        title
        handle
        status
        tags
        featuredImage { url }
        sp: metafield(namespace: "echo", key: "system_prompt") { value }
        tg: metafield(namespace: "echo", key: "tagline") { value }
        variants(first: 1) { nodes { id price } }
      }
    }
  }`;
  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.products.nodes;
}

function numericId(gid) {
  const m = String(gid).match(/(\d+)\s*$/);
  return m ? m[1] : String(gid);
}

async function main() {
  console.log("🔄 Synchronizuję produkty Shopify → Supabase...\n");
  const products = await fetchProducts();

  let ok = 0;
  for (const p of products) {
    const prompt = p.sp?.value;
    if (!prompt) {
      console.warn(`⚠ Pomijam ${p.title} — brak echo.system_prompt`);
      continue;
    }
    const variant = p.variants?.nodes?.[0];
    const priceCents = variant ? Math.round(parseFloat(variant.price) * 100) : 0;
    const tags = (p.tags ?? []).map((t) => String(t).toLowerCase());
    const isFree = priceCents === 0 || tags.includes("free");

    const row = {
      handle: p.handle,
      shopify_product_id: numericId(p.id),
      shopify_variant_id: variant ? numericId(variant.id) : null,
      name: p.title,
      tagline: p.tg?.value ?? null,
      image_url: p.featuredImage?.url ?? null,
      price_cents: priceCents,
      is_free: isFree,
      system_prompt: prompt,
      active: p.status === "ACTIVE",
      sort: p.handle === "freud" ? 0 : 1,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("therapists").upsert(row, { onConflict: "handle" });
    if (error) {
      console.error(`✗ ${p.title}:`, error.message);
    } else {
      console.log(`✓ ${p.title} (${isFree ? "darmowy" : priceCents / 100 + " PLN"})`);
      ok++;
    }
  }
  console.log(`\n✅ Zsynchronizowano ${ok}/${products.length} terapeutów`);
}

main().catch((e) => { console.error(e); process.exit(1); });
