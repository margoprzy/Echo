"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, X, Bot, Mic, Square } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  getEntries,
  getOrCreateConversation,
  getMessages,
  appendMessage,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import type { Entry } from "@/lib/types";

const RECENT_DAYS = 30;
const MAX_COMPOSER_H = 150; // ~6 linii, potem pole przewija się w środku

function isWithinRecentDays(iso: string, ref: Date, days: number): boolean {
  const d = new Date(iso).getTime();
  const cutoff = ref.getTime() - days * 24 * 60 * 60 * 1000;
  return d >= cutoff && d <= ref.getTime();
}

/**
 * Z kompletu wpisów wylicza kontekst rozmowy:
 * - contextEntry: kliknięty wpis (oś, do banera/auto-startu),
 * - dayEntries: WSZYSTKIE wpisy z dnia tego wpisu (krótkie myśli z całego dnia),
 * - recentEntries: tło z ostatnich 30 dni, z pominięciem analizowanego dnia.
 */
function computeContext(rows: Entry[], entryId: string | null) {
  const contextEntry = entryId ? rows.find((e) => e.id === entryId) ?? null : null;
  const focalDay = contextEntry ? contextEntry.date.slice(0, 10) : null;
  const now = new Date();
  const dayEntries = focalDay
    ? rows.filter((e) => e.date.slice(0, 10) === focalDay)
    : [];
  const recentEntries = rows.filter(
    (e) => isWithinRecentDays(e.date, now, RECENT_DAYS) && e.date.slice(0, 10) !== focalDay
  );
  return { contextEntry, dayEntries, recentEntries };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function toUIMessage(role: "user" | "assistant", content: string, id: string): UIMessage {
  return { id, role, parts: [{ type: "text", text: content }] };
}

function AiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entryId = searchParams.get("entry");
  const mode: "entry" | "general" = entryId ? "entry" : "general";

  const [contextEntry, setContextEntry] = useState<Entry | null>(null);
  const [dayCount, setDayCount] = useState(0);
  const [activeTherapist, setActiveTherapist] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const sessionTokenRef = useRef<string | null>(null);

  // Kontekst dla każdego żądania (wszystkie wpisy dnia + ostatnie 30 dni) — wstrzykiwany przez transport.
  const ctxRef = useRef<{ dayEntries: Entry[]; recentEntries: Entry[] }>({
    dayEntries: [],
    recentEntries: [],
  });
  const conversationIdRef = useRef<string | null>(null);
  const autoStartedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/freud",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            dayEntries: ctxRef.current.dayEntries,
            recentEntries: ctxRef.current.recentEntries,
            sessionToken: sessionTokenRef.current,
          },
        }),
      }),
    []
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    onFinish: ({ message }) => {
      const convId = conversationIdRef.current;
      const text = messageText(message);
      if (convId && text.trim()) {
        appendMessage(convId, "assistant", text);
      }
    },
  });

  const isBusy = status === "submitted" || status === "streaming";

  // Ładowanie wpisów, kontekstu i historii rozmowy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Pobierz access token sesji Supabase — potrzebny do wyszukiwania hybrydowego.
      const { data: { session } } = await supabase.auth.getSession();
      sessionTokenRef.current = session?.access_token ?? null;

      // Aktywny terapeuta (do wyświetlenia w nagłówku). Serwer i tak weryfikuje dostęp.
      supabase.rpc("list_therapists").then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        const active = data.find((t: { is_active_selection?: boolean }) => t.is_active_selection);
        setActiveTherapist((active as { name?: string } | undefined)?.name ?? null);
      });

      const rows = await getEntries();
      if (cancelled) return;
      const c = computeContext(rows, entryId);

      setContextEntry(c.contextEntry);
      setDayCount(c.dayEntries.length);
      ctxRef.current = { dayEntries: c.dayEntries, recentEntries: c.recentEntries };

      const convId = await getOrCreateConversation(mode, entryId);
      if (cancelled) return;
      conversationIdRef.current = convId;

      if (convId) {
        const stored = await getMessages(convId);
        if (cancelled) return;
        if (stored.length > 0) {
          setMessages(stored.map((m) => toUIMessage(m.role, m.content, m.id)));
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryId]);

  // Proaktywny start w trybie analizy wpisu — Freud sam otwiera rozmowę analizą dnia.
  useEffect(() => {
    if (!ready || autoStartedRef.current) return;
    if (mode === "entry" && contextEntry && messages.length === 0) {
      autoStartedRef.current = true;
      const label = formatDate(contextEntry.date);
      send(
        dayCount > 1
          ? `Przeanalizuj proszę moje wpisy z ${label}.`
          : `Przeanalizuj proszę mój wpis z ${label}.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, contextEntry, mode, messages.length]);

  // Autoscroll do najnowszej wiadomości.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isBusy]);

  // Auto-rozszerzanie pola czatu na wysokość (pisanie i dyktowanie) — do ~6 linii, potem przewijanie.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_COMPOSER_H)}px`;
  }, [input]);

  const { isRecording, toast: micToast, toggle: toggleMic } = useSpeechRecognition(
    (text) => setInput((m) => (m ? m + text : text))
  );

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    // Odśwież kontekst najświeższymi wpisami — łapie nowo dodane wpisy z tego samego dnia.
    try {
      const rows = await getEntries();
      const c = computeContext(rows, entryId);
      ctxRef.current = { dayEntries: c.dayEntries, recentEntries: c.recentEntries };
      setContextEntry(c.contextEntry);
      setDayCount(c.dayEntries.length);
    } catch {
      // jeśli odświeżenie się nie uda, używamy poprzedniego kontekstu
    }
    const convId = conversationIdRef.current;
    if (convId) appendMessage(convId, "user", trimmed);
    sendMessage({ text: trimmed });
  }

  function handleSend() {
    if (!input.trim()) return;
    send(input);
    setInput("");
  }

  function handleCloseContext() {
    if (contextEntry) {
      router.push(`/entries/${contextEntry.id}`);
    } else {
      router.push("/ai");
    }
  }

  const showGreeting = ready && mode === "general" && messages.length === 0;
  const toast = micToast ?? (error ? "Coś poszło nie tak. Spróbuj ponownie." : null);

  return (
    <div className="px-5 pt-3 pb-4 flex flex-col min-h-[calc(100dvh-5rem)] md:min-h-[calc(100dvh-3rem)]">
      {/* Header — desktop only */}
      <div className="hidden md:flex items-center gap-2 echo-enter">
        <Bot size={20} style={{ color: "#A07DE0" }} />
        <h1 className="text-2xl font-semibold text-white tracking-tight">Analiza AI</h1>
      </div>
      {activeTherapist && (
        <p className="text-[12px] text-white/40 mt-1 md:mt-1.5 echo-enter">
          Rozmawiasz z: <span className="text-white/70">{activeTherapist}</span>
        </p>
      )}

      {/* Context banner */}
      {contextEntry && (
        <div
          className="mt-6 flex items-center justify-between gap-3 px-4 py-2.5 rounded-[14px] border echo-enter"
          style={{
            background: "rgba(124,92,191,0.12)",
            borderColor: "rgba(124,92,191,0.35)",
            ["--enter-delay" as string]: "60ms",
          }}
        >
          <div className="min-w-0">
            <p className="text-[11px] text-white/40 uppercase tracking-wide">
              {dayCount > 1 ? "Analizujesz dzień" : "Analizujesz wpis"}
            </p>
            <p className="text-sm text-white/90 capitalize truncate">
              {formatDate(contextEntry.date)}
            </p>
          </div>
          <button
            onClick={handleCloseContext}
            aria-label="Zamknij i wróć do wpisu"
            className="p-1.5 rounded-full text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto mt-6 space-y-4 pr-1">
        {showGreeting && (
          <FreudBubble>
            Witaj. Opowiedz, co Cię teraz zajmuje — a wspólnie przyjrzymy się temu, co
            kryje się pod powierzchnią Twoich zapisków z ostatnich tygodni.
          </FreudBubble>
        )}

        {messages.map((m) =>
          m.role === "assistant" ? (
            <FreudBubble key={m.id}>{messageText(m)}</FreudBubble>
          ) : (
            <div key={m.id} className="flex justify-end echo-enter">
              <div
                className="max-w-[85%] px-4 py-3 rounded-[18px] rounded-tr-[6px] text-sm text-white leading-relaxed whitespace-pre-wrap"
                style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
              >
                {messageText(m)}
              </div>
            </div>
          )
        )}

        {status === "submitted" && (
          <FreudBubble>
            <span className="inline-flex items-center gap-1 text-white/50">
              <span className="echo-pulse-ring inline-block w-1.5 h-1.5 rounded-full bg-white/60" />
              Zastanawiam się…
            </span>
          </FreudBubble>
        )}
      </div>

      {/* Composer */}
      <div
        className="mt-4 flex items-end gap-2.5 px-4 py-3 rounded-[22px] border border-white/20 echo-enter"
        style={{
          background: "rgba(255,255,255,0.08)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          ["--enter-delay" as string]: "180ms",
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isRecording ? "Słucham…" : "Napisz wiadomość…"}
          className="flex-1 bg-transparent text-[15px] text-white/90 placeholder-white/40 outline-none resize-none py-1.5 px-1 leading-relaxed"
          style={{ maxHeight: `${MAX_COMPOSER_H}px` }}
        />
        <button
          type="button"
          onClick={toggleMic}
          aria-label={isRecording ? "Zatrzymaj transkrypcję" : "Dyktuj wiadomość"}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
            isRecording ? "echo-pulse-ring" : ""
          }`}
          style={{
            background: isRecording
              ? "linear-gradient(135deg, #C0392B 0%, #E74C3C 100%)"
              : "rgba(255,255,255,0.08)",
            border: isRecording ? "none" : "1px solid rgba(255,255,255,0.15)",
          }}
        >
          {isRecording ? (
            <Square size={15} className="text-white" fill="white" />
          ) : (
            <Mic size={18} className="text-white/75" />
          )}
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isBusy}
          aria-label="Wyślij"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
        >
          <Send size={16} className="text-white" />
        </button>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm text-white border border-white/10"
          style={{
            bottom: "110px",
            background: "rgba(17,14,36,0.92)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function FreudBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 echo-enter">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
      >
        <Bot size={18} className="text-white" />
      </div>
      <div
        className="max-w-[85%] px-4 py-3 rounded-[18px] rounded-tl-[6px] text-sm text-white/85 leading-relaxed whitespace-pre-wrap"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={null}>
      <AiContent />
    </Suspense>
  );
}
