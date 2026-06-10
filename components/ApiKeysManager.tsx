"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, Plus, Copy, Check, Trash2, LogIn } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { listApiKeys, createApiKey, deleteApiKey, type ApiKeyInfo } from "@/lib/apiKeys";
import { copyText } from "@/lib/clipboard";

/**
 * Panel zarządzania kluczami API. Osadzony w dokumentacji (/docs).
 * Strona jest publiczna, więc panel sam reaguje na stan logowania:
 *  - zalogowany → generowanie / lista / usuwanie kluczy,
 *  - niezalogowany → zachęta do logowania.
 */
export default function ApiKeysManager() {
  const { session } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    listApiKeys().then((k) => {
      setKeys(k);
      setLoading(false);
    });
  }, [session]);

  async function handleCreate() {
    setCreating(true);
    const token = await createApiKey(label);
    if (token) {
      setNewToken(token);
      setLabel("");
      setKeys(await listApiKeys());
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    const ok = await deleteApiKey(id);
    if (ok) setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function copyToken() {
    if (!newToken) return;
    const ok = await copyText(newToken);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <section
      id="keys"
      className="scroll-mt-20 p-5 rounded-[20px] border border-white/10 space-y-4"
      style={{ background: "rgba(124,92,191,0.08)" }}
    >
      <div className="flex items-center gap-2.5">
        <KeyRound size={18} className="text-[#A07DE0] shrink-0" />
        <div>
          <h2 className="text-lg font-semibold text-white">Twoje klucze API</h2>
          <p className="text-xs text-white/40">Wygeneruj token i użyj go w nagłówku Authorization</p>
        </div>
      </div>

      {/* Niezalogowany — zachęta do logowania */}
      {!session ? (
        <div className="space-y-3">
          <p className="text-sm text-white/55 leading-relaxed">
            Aby wygenerować klucz API, zaloguj się do swojego konta Echo. Klucz działa w kontekście
            zalogowanego użytkownika.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-semibold text-white active:scale-[0.97] transition-all"
            style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
          >
            <LogIn size={16} />
            Zaloguj się
          </Link>
        </div>
      ) : (
        <>
          {/* Świeżo utworzony token — pokazany raz */}
          {newToken && (
            <div
              className="p-3 rounded-[14px] space-y-2"
              style={{ background: "rgba(124,92,191,0.16)", border: "1px solid rgba(160,125,224,0.4)" }}
            >
              <p className="text-[11px] text-[#C4A8FF]">Skopiuj teraz — token zobaczysz tylko raz.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-white/90 break-all font-mono">{newToken}</code>
                <button
                  onClick={copyToken}
                  className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white active:bg-white/10 transition-colors"
                  aria-label="Kopiuj token"
                >
                  {copied ? <Check size={16} className="text-[#34D399]" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Lista kluczy */}
          {!loading && keys.length > 0 && (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[12px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-white/80 truncate">
                      {k.prefix}…{k.label ? ` · ${k.label}` : ""}
                    </p>
                    <p className="text-[10px] text-white/35">
                      {k.last_used_at
                        ? `Użyto ${new Date(k.last_used_at).toLocaleDateString("pl-PL")}`
                        : "Jeszcze nieużywany"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-[#F87171] active:bg-white/10 transition-colors"
                    aria-label="Usuń klucz"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && keys.length === 0 && !newToken && (
            <p className="text-xs text-white/40">Nie masz jeszcze żadnego klucza API.</p>
          )}

          {/* Tworzenie */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nazwa (opcjonalnie, np. „Mój agent”)"
              className="flex-1 px-3 py-2.5 rounded-[12px] text-xs text-white placeholder-white/25 outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,92,191,0.25)" }}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-xs font-semibold text-white disabled:opacity-50 active:scale-[0.97] transition-all"
              style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
            >
              <Plus size={15} />
              Nowy
            </button>
          </div>
        </>
      )}
    </section>
  );
}
