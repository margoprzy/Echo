#!/usr/bin/env node
/**
 * Symuluje podpisane zdarzenie Stripe `checkout.session.completed` i wysyła je
 * do lokalnego webhooka, by przetestować odblokowanie terapeuty.
 * Uruchomienie:
 *   USER_ID=... HANDLE=nietzsche SECRET=whsec_... URL=http://localhost:3000/api/stripe/webhook \
 *   node scripts/simulateStripeWebhook.mjs
 */
import { createHmac } from "crypto";

const USER_ID = process.env.USER_ID;
const HANDLE = process.env.HANDLE || "nietzsche";
const SECRET = process.env.SECRET;
const URL = process.env.URL || "http://localhost:3000/api/stripe/webhook";

if (!USER_ID || !SECRET) {
  console.error("Brak USER_ID lub SECRET");
  process.exit(1);
}

function buildSignedRequest(payloadObj, secret, { tamper = false } = {}) {
  const payload = JSON.stringify(payloadObj);
  const t = Math.floor(Date.now() / 1000);
  let sig = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  if (tamper) sig = "0".repeat(sig.length);
  return { payload, header: `t=${t},v1=${sig}` };
}

const event = {
  id: "evt_test_" + Date.now(),
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_" + Date.now(),
      object: "checkout.session",
      client_reference_id: `${USER_ID}__${HANDLE}`,
      payment_status: "paid",
      status: "complete",
      amount_total: 1900,
      currency: "pln",
    },
  },
};

async function send(label, { tamper = false } = {}) {
  const { payload, header } = buildSignedRequest(event, SECRET, { tamper });
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": header },
    body: payload,
  });
  const text = await res.text();
  console.log(`${label}: HTTP ${res.status} — "${text}"`);
  return res.status;
}

console.log(`\n🧪 Test webhooka Stripe`);
console.log(`   Użytkownik: ${USER_ID}`);
console.log(`   Terapeuta:  ${HANDLE}\n`);

console.log("1) Test negatywny (zły podpis) — oczekiwane 401:");
await send("   wynik", { tamper: true });

console.log("\n2) Test właściwy (poprawny podpis) — oczekiwane 200:");
await send("   wynik");
