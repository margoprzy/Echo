"use client";

import { useEffect, useState } from "react";
import ActivityCalendar from "@/components/ActivityCalendar";
import { getEntries } from "@/lib/storage";
import type { Entry } from "@/lib/types";

export default function CalendarPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    let cancelled = false;
    getEntries().then((rows) => {
      if (!cancelled) setEntries(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-5 pt-4 md:pt-12 pb-6">
      <div className="hidden md:block mb-6 echo-enter">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Kalendarz</h1>
        <p className="text-sm text-white/40 mt-0.5">Twoja aktywność</p>
      </div>
      <div className="echo-enter" style={{ ["--enter-delay" as string]: "90ms" }}>
        <ActivityCalendar entries={entries} />
      </div>
    </div>
  );
}
