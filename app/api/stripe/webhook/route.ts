import { createHmac, timingSafeEqual } from "crypto";
import { cleanEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Webhook Stripe — odblokowuje terapeutę po opłaceniu (Payment Link).
 * Płatność idzie przez Stripe Payment Link; tożsamość kupującego i wybranego
 * terapeuty przekazujemy w `client_reference_id` w formacie `{userId}__{handle}`.
 *
 * Weryfikacja podpisu (nagłówek `stripe-signature`) sekretem STRIPE_WEBHOOK_SECRET.
 */
export const dynamic = "force-dynamic";

/** Ręczna weryfikacja podpisu Stripe (bez SDK). */
function verifyStripeSignature(rawBody: string, sigHeader: string | null, secret: string): boolean {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k.trim(), (v ?? "").trim()];
    })
  );
  const timestamp = parts["t"];
  const v1 = parts["v1"];
  if (!timestamp || !v1) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function grantAccess(userId: string, handle: string, ref: string) {
  const db = supabaseAdmin();
  const { data: therapist, error: tErr } = await db
    .from("therapists")
    .select("id")
    .eq("handle", handle)
    .single();
  if (tErr || !therapist) {
    console.warn(`Stripe webhook: nie znaleziono terapeuty o handle '${handle}'.`);
    return;
  }
  const { error } = await db
    .from("user_therapists")
    .upsert(
      { user_id: userId, therapist_id: therapist.id, shopify_order_id: ref },
      { onConflict: "user_id,therapist_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(`grant_access_failed: ${error.message}`);
}

export async function POST(req: Request) {
  const raw = await req.text();
  const secret = cleanEnv(process.env.STRIPE_WEBHOOK_SECRET);
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return new Response("invalid signature", { status: 401 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object ?? {};
      const ref = String(session.client_reference_id ?? "");
      const paid = session.payment_status === "paid" || session.status === "complete";
      const [userId, handle] = ref.split("__");
      if (paid && userId && handle) {
        await grantAccess(userId, handle, String(session.id ?? ref));
      } else {
        console.warn(`Stripe webhook: pominięto (paid=${paid}, ref='${ref}').`);
      }
    }
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return new Response("processing error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
