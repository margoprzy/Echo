"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import EntryCard from "@/components/EntryCard";
import { getEntries } from "@/lib/storage";
import type { Entry } from "@/lib/types";

export default function EntriesPage() {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  return (
    <div className="px-5 pt-12 pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Wpisy</h1>
        <p className="text-sm text-white/40 mt-0.5">
          {entries.length === 0
            ? "Brak wpisów"
            : `${entries.length} ${entries.length === 1 ? "wpis" : entries.length < 5 ? "wpisy" : "wpisów"}`}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#7C5CBF]/10 border border-[#7C5CBF]/20 flex items-center justify-center">
            <PenLine size={24} className="text-[#7C5CBF]" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Nie masz jeszcze żadnych wpisów.</p>
            <p className="text-white/30 text-xs mt-1">Napisz swój pierwszy!</p>
          </div>
          <Link
            href="/write"
            className="mt-2 px-5 py-2.5 rounded-full text-sm font-medium text-white"
            style={{
              background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
            }}
          >
            Napisz wpis
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
