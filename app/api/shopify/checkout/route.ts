import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanEnv } from "@/lib/env";

/**
 * Tworzy checkout Shopify dla wybranego terapeuty i zwraca jego URL.
 * Tożsamość kupującego (echo_user_id) jest wpisywana w atrybut koszyka,
 * by webhook orders/paid mógł nadać dostęp właściwemu użytkownikowi.
 *
 * Autoryzacja: nagłówek Authorization: Bearer <access_token sesji Supabase>.
 */
export const dynamic = "force-dynamic";

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") ?? req.headers.get("Authorization");
  const m = h?.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) {
    return Response.json({ error: "Brak autoryzacji." }, { status: 401 });
  }

  let therapistId: string | undefined;
  try {
    ({ therapistId } = (await req.json()) as { therapistId?: string });
  } catch {
    return Response.json({ error: "Nieprawidłowe żądanie." }, { status: 400 });
  }
  if (!therapistId) {
    return Response.json({ error: "Brak therapistId." }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Walidacja tożsamości użytkownika z tokenu sesji.
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData.user) {
    return Response.json({ error: "Nieprawidłowa sesja." }, { status: 401 });
  }
  const userId = userData.user.id;

  // Znajdź terapeutę i jego wariant Shopify.
  const { data: therapist, error: tErr } = await db
    .from("therapists")
    .select("id, name, is_free, active, shopify_variant_id")
    .eq("id", therapistId)
    .single();
  if (tErr || !therapist || !therapist.active) {
    return Response.json({ error: "Nie znaleziono terapeuty." }, { status: 404 });
  }
  if (therapist.is_free) {
    return Response.json({ error: "Ten terapeuta jest darmowy." }, { status: 400 });
  }
  if (!therapist.shopify_variant_id) {
    return Response.json(
      { error: "Terapeuta nie ma skonfigurowanego produktu Shopify." },
      { status: 409 }
    );
  }

  const domain = cleanEnv(process.env.SHOPIFY_STORE_DOMAIN);
  if (!domain) {
    return Response.json({ error: "Brak konfiguracji sklepu." }, { status: 500 });
  }

  // Link do kasy Shopify: dodaje wariant terapeuty do koszyka i przechodzi do checkoutu.
  // echo_user_id w atrybucie koszyka (best-effort); tożsamość potwierdzamy też po e-mailu
  // w webhooku orders/paid.
  const url =
    `https://${domain}/cart/${therapist.shopify_variant_id}:1` +
    `?attributes[echo_user_id]=${encodeURIComponent(userId)}`;
  return Response.json({ url });
}
