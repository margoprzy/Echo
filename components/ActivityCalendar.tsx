"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import type { Entry } from "@/lib/types";

interface ActivityCalendarProps {
  entries: Entry[];
}

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function getDaysWithEntries(entries: Entry[]): Set<string> {
  return new Set(entries.map((e) => e.date.slice(0, 10)));
}

function calcStreak(entries: Entry[]): number {
  const days = [...getDaysWithEntries(entries)].sort().reverse();
  if (!days.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cursor = new Date(today);
  for (const day of days) {
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (day === cursorStr) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (day < cursorStr) {
      break;
    }
  }
  return streak;
}

export default function ActivityCalendar({ entries }: ActivityCalendarProps) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const activeDays = getDaysWithEntries(entries);
  const streak = calcStreak(entries);
  const today = now.toISOString().slice(0, 10);

  const firstDay = new Date(year, month, 1);
  // Monday-first: 0=Mon..6=Sun
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = startOffset + daysInMonth;
  const weeks = Math.ceil(totalCells / 7);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="space-y-4">
      {streak > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[20px] border border-[#7C5CBF]/30 bg-[#7C5CBF]/10">
          <Flame size={18} className="text-[#A07DE0]" />
          <span className="text-white/80 text-sm">
            <span className="text-white font-semibold">{streak}</span>{" "}
            {streak === 1 ? "dzień z rzędu" : "dni z rzędu"}
          </span>
        </div>
      )}

      <div className="p-4 rounded-[20px] border border-white/10 bg-white/[0.055]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-white/80 text-sm font-medium capitalize">{monthLabel}</p>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[11px] text-white/30 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: weeks * 7 }).map((_, i) => {
            const dayNum = i - startOffset + 1;
            if (dayNum < 1 || dayNum > daysInMonth) {
              return <div key={i} />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
            const hasEntry = activeDays.has(dateStr);
            const isToday = dateStr === today;
            const entry = hasEntry
              ? entries.find((e) => e.date.slice(0, 10) === dateStr)
              : null;

            return (
              <div key={i} className="flex items-center justify-center py-0.5">
                <div
                  onClick={() => entry && router.push(`/entries/${entry.id}`)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors
                    ${hasEntry
                      ? "bg-[#7C5CBF] text-white font-semibold cursor-pointer hover:bg-[#9370DB] active:scale-95"
                      : isToday
                      ? "border border-[#7C5CBF] text-white/80"
                      : "text-white/40"
                    }`}
                >
                  {dayNum}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
