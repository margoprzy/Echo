"use client";

import { useEffect, useRef } from "react";

const DAYS_BACK = 7;
const DAYS_FORWARD = 7;
const DAY_ABBR = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

function localDateStr(d: Date): string {
  return d.toLocaleDateString("sv");
}

function buildDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = -DAYS_BACK; i <= DAYS_FORWARD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(localDateStr(d));
  }
  return days;
}

function formatHeaderDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d
    .toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .toUpperCase();
}

interface DayStripProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  datesWithEntries: string[];
}

export default function DayStrip({
  selectedDate,
  onSelect,
  datesWithEntries,
}: DayStripProps) {
  const days = buildDays();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const entrySet = new Set(datesWithEntries);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "instant" as ScrollBehavior,
        block: "nearest",
        inline: "center",
      });
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="sticky top-0 z-10 pt-10 pb-3"
      style={{ background: "transparent" }}
    >
      <p className="px-5 mb-3 text-[11px] font-semibold tracking-[0.12em] text-white/40">
        {formatHeaderDate(selectedDate)}
      </p>

      <div
        ref={scrollRef}
        className="flex gap-2 px-5"
        style={{
          overflowX: "scroll",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties}
      >
        {days.map((dateStr) => {
          const d = new Date(dateStr + "T12:00:00");
          const dayNum = d.getDate();
          const dayAbbr = DAY_ABBR[d.getDay()];
          const isSelected = dateStr === selectedDate;
          const hasEntry = entrySet.has(dateStr);

          return (
            <button
              key={dateStr}
              ref={isSelected ? activeRef : undefined}
              onClick={() => onSelect(dateStr)}
              className="flex-shrink-0 flex flex-col items-center gap-1 transition-all duration-200 active:scale-95"
              style={{
                width: 52,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 14,
                background: isSelected
                  ? "rgba(124,92,191,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: isSelected
                  ? "1.5px solid rgba(124,92,191,0.7)"
                  : "1.5px solid rgba(255,255,255,0.07)",
                boxShadow: isSelected
                  ? "0 0 14px rgba(124,92,191,0.28)"
                  : "none",
              }}
            >
              <span
                className="text-[10px] font-semibold tracking-wider"
                style={{
                  color: isSelected ? "#A07DE0" : "rgba(255,255,255,0.38)",
                }}
              >
                {dayAbbr}
              </span>
              <span
                className="text-[19px] font-bold leading-none"
                style={{
                  color: isSelected ? "#ffffff" : "rgba(255,255,255,0.55)",
                }}
              >
                {dayNum}
              </span>
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: hasEntry ? "#A07DE0" : "transparent",
                  marginTop: 1,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
