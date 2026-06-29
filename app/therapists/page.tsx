"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Check, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { track } from "@/lib/analytics";

interface Therapist {
  id: string;
  handle: string;
  name: string;
  tagline: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  is_free: boolean;
  owned: boolean;
  is_active_selection: boolean;
}

function formatPrice(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function TherapistsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Dane sesji pobrane z góry — by „Kup" mógł przekierować SYNCHRONICZNIE w geście
  // kliknięcia (iOS Safari blokuje nawigację po await, gdy traci user gesture).
  const [auth, setAuth] = useState<{ userId: string | null; email: string | null }>({ userId: null, email: null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuth({
        userId: session?.user?.id ?? null,
        email: session?.user?.email ?? null,
      });
    });
  }, []);

  // Gotowy URL płatności Stripe dla terapeuty — używany jako natywny <a href>
  // (link natywny działa na iOS niezawodnie, w przeciwieństwie do nawigacji przez JS po await).
  function stripeUrlFor(t: Therapist): string | null {
    const base = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
    if (!base || !auth.userId) return null;
    const url = new URL(base);
    url.searchParams.set("client_reference_id", `${auth.userId}__${t.handle}`);
    if (auth.email) url.searchParams.set("prefilled_email", auth.email);
    return url.toString();
  }

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("list_therapists");
    if (!error && Array.isArray(data)) {
      setTherapists(data as Therapist[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Powrót z udanej płatności (Stripe → /therapists?purchased=1). Dostęp pojawia się po
  // przetworzeniu webhooka, więc odpytujemy listę aż terapeuta będzie odblokowany.
  useEffect(() => {
    if (searchParams.get("purchased") !== "1") return;
    setToast("Płatność odnotowana — odblokowuję terapeutę…");
    let pendingHandle: string | null = null;
    try {
      pendingHandle = localStorage.getItem("echo_pending_purchase");
    } catch {}
    let cancelled = false;
    let tries = 0;
    const poll = async () => {
      tries++;
      const { data } = await supabase.rpc("list_therapists");
      if (cancelled) return;
      const list = Array.isArray(data) ? (data as Therapist[]) : [];
      if (list.length) setTherapists(list);
      // Kupiony terapeuta: po handle (jeśli znany) albo dowolny świeżo odblokowany płatny.
      const target = pendingHandle
        ? list.find((t) => t.handle === pendingHandle && t.owned)
        : list.find((t) => !t.is_free && t.owned);
      if (target) {
        track("therapist_purchased", {
          handle: target.handle,
          name: target.name,
          price_cents: target.price_cents,
          currency: target.currency,
        });
        // Nie ustawiamy aktywnego automatycznie — karta sama pokazuje już „Wybierz”
        // (lista odświeżona powyżej), a użytkownik klika „Wybierz” sam.
        setToast(`Gotowe! ${target.name} odblokowany — kliknij „Wybierz”.`);
        try {
          localStorage.removeItem("echo_pending_purchase");
        } catch {}
        return;
      }
      if (tries < 8) {
        setTimeout(poll, 2000);
      } else {
        setToast("Płatność odnotowana. Jeśli terapeuta wciąż zablokowany, odśwież za chwilę.");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function selectTherapist(id: string) {
    setBusyId(id);
    const { error } = await supabase.rpc("set_active_therapist", { p_therapist_id: id });
    if (error) {
      setToast("Nie udało się ustawić terapeuty.");
      setBusyId(null);
      return;
    }
    track("therapist_selected", { therapist_id: id });
    // Po wyborze terapeuty przenosimy użytkownika prosto do czatu „Analiza AI".
    router.push("/ai");
  }


  return (
    <div className="px-5 pt-3 pb-10 max-w-3xl mx-auto">
      {/* Header — desktop */}
      <div className="hidden md:flex items-center gap-2 echo-enter">
        <Users size={20} style={{ color: "#A07DE0" }} />
        <h1 className="text-2xl font-semibold text-white tracking-tight">Wybierz terapeutę</h1>
      </div>
      <p className="text-sm text-white/50 mt-2 md:mt-3 echo-enter">
        Rozmawiaj z wybraną osobowością. Freud jest dostępny za darmo — kolejni terapeuci po wykupieniu dostępu.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 mt-10">
          <Loader2 size={18} className="animate-spin" /> Ładowanie…
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {therapists.map((t) => {
            const locked = !t.owned;
            const busy = busyId === t.id;
            return (
              <div
                key={t.id}
                className={`relative rounded-[18px] border p-5 transition-colors echo-enter ${
                  t.is_active_selection
                    ? "border-[#7C5CBF]/60 bg-[#7C5CBF]/[0.12]"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                {t.is_active_selection && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-[11px] text-[#A07DE0]">
                    <Check size={13} /> Aktywny
                  </span>
                )}

                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${
                      locked ? "opacity-50" : ""
                    }`}
                    style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
                  >
                    {t.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={22} className="text-white" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-base font-semibold ${locked ? "text-white/50" : "text-white"}`}>
                      {t.name}
                    </p>
                    <p className="text-[12px] text-white/40">
                      {t.is_free ? "Za darmo" : formatPrice(t.price_cents, t.currency)}
                    </p>
                  </div>
                </div>

                {t.tagline && (
                  <p className={`text-sm mt-3 leading-relaxed ${locked ? "text-white/35" : "text-white/65"}`}>
                    {t.tagline}
                  </p>
                )}

                <div className="mt-4">
                  {t.owned ? (
                    <button
                      onClick={() => selectTherapist(t.id)}
                      disabled={busy || t.is_active_selection}
                      className="w-full py-2.5 rounded-[12px] text-sm font-medium text-white transition-all active:scale-[0.99] disabled:opacity-40"
                      style={{
                        background: t.is_active_selection
                          ? "rgba(255,255,255,0.08)"
                          : "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
                      }}
                    >
                      {busy ? "…" : t.is_active_selection ? "Wybrany" : "Wybierz"}
                    </button>
                  ) : stripeUrlFor(t) ? (
                    <a
                      href={stripeUrlFor(t)!}
                      onClick={() => {
                        track("therapist_checkout_started", {
                          handle: t.handle,
                          name: t.name,
                          price_cents: t.price_cents,
                          currency: t.currency,
                        });
                        // Zapamiętaj, którego terapeutę kupujemy — po powrocie z płatności
                        // ustawimy go automatycznie jako aktywnego.
                        try {
                          localStorage.setItem("echo_pending_purchase", t.handle);
                        } catch {}
                      }}
                      className="w-full py-2.5 rounded-[12px] text-sm font-medium text-white border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
                    >
                      <Lock size={14} />
                      Kup
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-[12px] text-sm font-medium text-white border border-white/15 bg-white/[0.04] opacity-40 inline-flex items-center justify-center gap-2"
                    >
                      <Loader2 size={15} className="animate-spin" />
                      Kup
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm text-white border border-white/10 max-w-[90%] text-center"
          style={{
            bottom: "90px",
            background: "rgba(17,14,36,0.92)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          onClick={() => setToast(null)}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function TherapistsPage() {
  return (
    <Suspense fallback={null}>
      <TherapistsContent />
    </Suspense>
  );
}
