#!/usr/bin/env node
/**
 * Ustawia cenę płatnych terapeutów (wariant z ceną > 0) na PRICE (domyślnie 5.00) w Shopify.
 * Uruchomienie: PRICE=5.00 node scripts/updateTherapistPrices.mjs
 */
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-10";
const PRICE = process.env.PRICE || "5.00";

if (!STORE_DOMAIN || !ADMIN_TOKEN) { console.error("Brak SHOPIFY_STORE_DOMAIN/SHOPIFY_ADMIN_TOKEN"); process.exit(1); }

async function gql(query, variables) {
  const res = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

const products = (await gql(`{ products(first:50){ nodes{ id title variants(first:1){ nodes{ id price } } } } }`)).data.products.nodes;

let ok = 0;
for (const p of products) {
  const v = p.variants.nodes[0];
  if (!v || parseFloat(v.price) === 0) { console.log(`– ${p.title}: darmowy, pomijam`); continue; }
  const r = await gql(
    `mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id price } userErrors { field message }
      }
    }`,
    { productId: p.id, variants: [{ id: v.id, price: PRICE }] }
  );
  const u = r.data?.productVariantsBulkUpdate;
  if (r.errors || u?.userErrors?.length) {
    console.error(`✗ ${p.title}:`, JSON.stringify(r.errors ?? u.userErrors));
  } else {
    console.log(`✓ ${p.title}: ${v.price} → ${u.productVariants[0].price} PLN`);
    ok++;
  }
}
console.log(`\nZaktualizowano ${ok} cen.`);
