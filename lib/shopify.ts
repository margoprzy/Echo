import { cleanEnv } from "@/lib/env";

/**
 * Klient Shopify dla Echo.
 * - Storefront API: tworzenie koszyka z atrybutem `echo_user_id` → zwraca checkoutUrl
 *   (płatność idzie przez checkout Shopify ze Stripe Card Payments w środku).
 * - Admin API: odczyt metafieldów produktu (prompt terapeuty `echo.system_prompt`)
 *   podczas synchronizacji wywołanej webhookiem.
 *
 * Echo nie integruje się ze Stripe bezpośrednio — Stripe jest skonfigurowany jako
 * dostawca płatności wewnątrz Shopify. Tu rozmawiamy wyłącznie z Shopify.
 */

const API_VERSION = cleanEnv(process.env.SHOPIFY_API_VERSION) || "2025-10";

function storeDomain(): string {
  const d = cleanEnv(process.env.SHOPIFY_STORE_DOMAIN);
  if (!d) throw new Error("missing_SHOPIFY_STORE_DOMAIN");
  return d;
}

/** Buduje GID wariantu z numerycznego id (jeśli nie jest już w formie gid://). */
export function variantGid(variantId: string): string {
  const v = String(variantId);
  return v.startsWith("gid://") ? v : `gid://shopify/ProductVariant/${v}`;
}

/** Numeryczne id produktu z GID-a lub surowej wartości. */
export function numericId(id: string): string {
  const m = String(id).match(/(\d+)\s*$/);
  return m ? m[1] : String(id);
}

async function adminGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = cleanEnv(process.env.SHOPIFY_ADMIN_TOKEN);
  if (!token) throw new Error("missing_SHOPIFY_ADMIN_TOKEN");
  const res = await fetch(
    `https://${storeDomain()}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`shopify_admin_error: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data as T;
}

async function storefrontGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = cleanEnv(process.env.SHOPIFY_STOREFRONT_TOKEN);
  if (!token) throw new Error("missing_SHOPIFY_STOREFRONT_TOKEN");
  const res = await fetch(
    `https://${storeDomain()}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
    }
  );
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`shopify_storefront_error: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data as T;
}

export interface ProductMetafields {
  systemPrompt: string | null;
  tagline: string | null;
}

/** Odczyt metafieldów `echo.system_prompt` i `echo.tagline` dla produktu (Admin API). */
export async function fetchProductMetafields(productId: string): Promise<ProductMetafields> {
  const gid = String(productId).startsWith("gid://")
    ? String(productId)
    : `gid://shopify/Product/${numericId(productId)}`;
  const data = await adminGraphQL<{
    product: {
      systemPrompt: { value: string } | null;
      tagline: { value: string } | null;
    } | null;
  }>(
    `query ProductMeta($id: ID!) {
      product(id: $id) {
        systemPrompt: metafield(namespace: "echo", key: "system_prompt") { value }
        tagline: metafield(namespace: "echo", key: "tagline") { value }
      }
    }`,
    { id: gid }
  );
  return {
    systemPrompt: data.product?.systemPrompt?.value ?? null,
    tagline: data.product?.tagline?.value ?? null,
  };
}

/**
 * Tworzy koszyk Shopify z jednym wariantem i atrybutem `echo_user_id`,
 * zwraca URL do checkoutu Shopify. Atrybut przechodzi do zamówienia jako
 * note_attribute — odczytujemy go w webhooku `orders/paid`, by nadać dostęp.
 */
export async function createCheckout(
  variantId: string,
  echoUserId: string
): Promise<string> {
  const data = await storefrontGraphQL<{
    cartCreate: {
      cart: { checkoutUrl: string } | null;
      userErrors: { field: string[]; message: string }[];
    };
  }>(
    `mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { checkoutUrl }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lines: [{ merchandiseId: variantGid(variantId), quantity: 1 }],
        attributes: [{ key: "echo_user_id", value: echoUserId }],
      },
    }
  );
  const errs = data.cartCreate.userErrors;
  if (errs?.length) {
    throw new Error(`cart_create_error: ${JSON.stringify(errs)}`);
  }
  const url = data.cartCreate.cart?.checkoutUrl;
  if (!url) throw new Error("cart_create_no_checkout_url");
  return url;
}
