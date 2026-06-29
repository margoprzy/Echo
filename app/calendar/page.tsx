"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import ActivityCalendar from "@/components/ActivityCalendar";
import { getEntries } from "@/lib/storage";
import type { Entry } from "@/lib/types";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(dateStr: string): string {
  // dateStr = YYYY-MM-DD; renderuj jako pełną datę po polsku
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    let cancelled = false;
    getEntries().then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wszystkie wpisy z wybranego dnia — chronologicznie (od rana).
  const dayEntries = useMemo(
    () =>
      entries
        .filter((e) => e.date.slice(0, 10) === selectedDay)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [entries, selectedDay]
  );

  // Do analizy całego dnia wystarczy dowolny wpis z tego dnia (kontekst i tak zbiera wszystkie).
  const latestOfDay = dayEntries[dayEntries.length - 1];

  return (
    <div className="px-5 pt-4 md:pt-12 pb-6">
      <div className="hidden md:block mb-6 echo-enter">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Kalendarz</h1>
        <p className="text-sm text-white/40 mt-0.5">Twoja aktywność</p>
      </div>

      <div className="echo-enter" style={{ ["--enter-delay" as string]: "90ms" }}>
        <ActivityCalendar
          entries={entries}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
      </div>

      {/* Wpisy z wybranego dnia */}
      <div className="mt-6 echo-enter" style={{ ["--enter-delay" as string]: "140ms" }}>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="text-sm font-medium text-white capitalize">{formatDayLabel(selectedDay)}</h2>
          {dayEntries.length > 0 && (
            <span className="text-xs text-white/40 shrink-0">
              {dayEntries.length} {dayEntries.length === 1 ? "wpis" : dayEntries.length < 5 ? "wpisy" : "wpisów"}
            </span>
          )}
        </div>

        {dayEntries.length === 0 ? (
          <div
            className="p-5 rounded-[18px] border border-white/10 flex flex-col items-center gap-3 text-center"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <p className="text-sm text-white/40">Brak wpisów w tym dniu.</p>
            <Link
              href="/write"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium text-[#C4A8FF] border border-[#A07DE0]/40 hover:bg-white/[0.06] transition-colors"
            >
              <PenLine size={14} />
              Dodaj wpis
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dayEntries.map((entry) => {
              const excerpt = stripHtml(entry.content).slice(0, 120);
              return (
                <Link
                  key={entry.id}
                  href={`/entries/${entry.id}`}
                  className="flex gap-3 p-4 rounded-[18px] border border-white/10 bg-white/[0.055] hover:bg-white/[0.09] hover:border-white/20 active:scale-[0.985] transition-all"
                >
                  <span className="text-xs text-[#A07DE0] font-medium shrink-0 mt-0.5 tabular-nums">
                    {formatTime(entry.date)}
                  </span>
                  <p data-ph-mask className="text-white/75 text-sm leading-relaxed line-clamp-2 min-w-0">
                    {excerpt || <span className="text-white/30 italic">Brak tekstu</span>}
                  </p>
                </Link>
              );
            })}

            {latestOfDay && (
              <div className="flex justify-center mt-1">
                <Link
                  href={`/ai?entry=${latestOfDay.id}`}
                  className="w-1/2 flex items-center justify-center py-3 rounded-[14px] font-semibold text-sm text-white active:scale-[0.98] transition-all"
                  style={{
                    background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
                    boxShadow: "0 8px 22px rgba(124,92,191,0.30)",
                  }}
                >
                  Analizuj z AI
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
