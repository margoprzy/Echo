import { createHmac, timingSafeEqual } from "crypto";
import { cleanEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchProductMetafields, numericId } from "@/lib/shopify";

/**
 * Webhook Shopify (jedyny punkt styku Echo ↔ Shopify dla zdarzeń):
 * - products/create|update → synchronizacja katalogu terapeutów do Supabase
 *   (z odczytem promptu z metafieldu echo.system_prompt przez Admin API),
 * - products/delete → dezaktywacja terapeuty,
 * - orders/paid → nadanie dostępu kupującemu (po echo_user_id z atrybutów koszyka).
 *
 * Każde żądanie jest weryfikowane podpisem HMAC (SHOPIFY_WEBHOOK_SECRET).
 */

export const dynamic = "force-dynamic";

function verifyHmac(rawBody: Buffer, hmacHeader: string | null): boolean {
  const secret = cleanEnv(process.env.SHOPIFY_WEBHOOK_SECRET);
  if (!secret || !hmacHeader) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface ShopifyVariant {
  id: number | string;
  price?: string;
}
interface ShopifyProduct {
  id: number | string;
  handle?: string;
  title?: string;
  status?: string;
  tags?: string;
  variants?: ShopifyVariant[];
  image?: { src?: string } | null;
  images?: { src?: string }[];
}
interface ShopifyOrder {
  id: number | string;
  email?: string | null;
  customer?: { email?: string | null } | null;
  note_attributes?: { name: string; value: string }[];
  line_items?: { product_id?: number | string }[];
}

async function syncProduct(product: ShopifyProduct) {
  const productId = String(product.id);
  const variant = product.variants?.[0];
  const priceCents = variant?.price ? Math.round(parseFloat(variant.price) * 100) : 0;
  const tags = (product.tags ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const isFree = priceCents === 0 || tags.includes("free");
  const imageUrl = product.image?.src ?? product.images?.[0]?.src ?? null;

  // Prompt i krótki opis trzymane są w metafieldach (nie ma ich w payloadzie webhooka).
  const meta = await fetchProductMetafields(productId);

  // Bez promptu nie da się prowadzić rozmowy — pomijamy taki produkt (poza darmowym, który ma seed).
  if (!meta.systemPrompt) {
    console.warn(`Shopify sync: produkt ${productId} bez echo.system_prompt — pomijam.`);
    return;
  }

  const row = {
    handle: product.handle ?? `product-${productId}`,
    shopify_product_id: productId,
    shopify_variant_id: variant ? String(variant.id) : null,
    name: product.title ?? "Terapeuta",
    tagline: meta.tagline,
    image_url: imageUrl,
    price_cents: priceCents,
    is_free: isFree,
    system_prompt: meta.systemPrompt,
    active: (product.status ?? "active") === "active",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin()
    .from("therapists")
    .upsert(row, { onConflict: "shopify_product_id" });
  if (error) throw new Error(`upsert_therapist_failed: ${error.message}`);
}

async function deactivateProduct(product: ShopifyProduct) {
  const { error } = await supabaseAdmin()
    .from("therapists")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("shopify_product_id", String(product.id));
  if (error) throw new Error(`deactivate_therapist_failed: ${error.message}`);
}

async function grantAccess(order: ShopifyOrder) {
  const db = supabaseAdmin();

  // Tożsamość: najpierw echo_user_id z atrybutów koszyka, w razie braku — dopasowanie po e-mailu.
  let userId: string | null =
    order.note_attributes?.find((a) => a.name === "echo_user_id")?.value ?? null;
  if (!userId) {
    const email = order.email ?? order.customer?.email ?? null;
    if (email) {
      const { data, error } = await db.rpc("api_user_id_by_email", { p_email: email });
      if (!error && data) userId = data as string;
    }
  }
  if (!userId) {
    console.warn(`Shopify orders/paid: brak echo_user_id i brak dopasowania e-mail (zam. ${order.id}) — pomijam.`);
    return;
  }

  const productIds = (order.line_items ?? [])
    .map((li) => (li.product_id != null ? String(li.product_id) : null))
    .filter((v): v is string => !!v);
  if (productIds.length === 0) return;

  const { data: therapists, error: selErr } = await db
    .from("therapists")
    .select("id, shopify_product_id")
    .in("shopify_product_id", productIds);
  if (selErr) throw new Error(`lookup_therapists_failed: ${selErr.message}`);
  if (!therapists?.length) return;

  const rows = therapists.map((t) => ({
    user_id: userId,
    therapist_id: t.id,
    shopify_order_id: String(order.id),
  }));
  const { error: insErr } = await db
    .from("user_therapists")
    .upsert(rows, { onConflict: "user_id,therapist_id", ignoreDuplicates: true });
  if (insErr) throw new Error(`grant_access_failed: ${insErr.message}`);
}

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  if (!verifyHmac(raw, req.headers.get("x-shopify-hmac-sha256"))) {
    return new Response("invalid hmac", { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  let payload: unknown;
  try {
    payload = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("bad json", { status: 400 });
  }

  try {
    switch (topic) {
      case "products/create":
      case "products/update":
        await syncProduct(payload as ShopifyProduct);
        break;
      case "products/delete":
        await deactivateProduct(payload as ShopifyProduct);
        break;
      case "orders/paid":
        await grantAccess(payload as ShopifyOrder);
        break;
      default:
        // Inne tematy ignorujemy, ale potwierdzamy odbiór (200), by Shopify nie ponawiał.
        break;
    }
  } catch (err) {
    console.error(`Shopify webhook (${topic}) error:`, err);
    return new Response("processing error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
