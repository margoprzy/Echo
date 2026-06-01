"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { getEntries, deleteEntry } from "@/lib/storage";
import type { Entry } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const found = getEntries().find((e) => e.id === id);
    setEntry(found ?? null);
  }, [id]);

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteEntry(id);
    router.push("/entries");
  }

  if (!entry) {
    return (
      <div className="px-5 pt-12 text-white/40 text-sm">Ładowanie...</div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-6 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Wstecz
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push(`/write?edit=${entry.id}`)}
            className="p-2 rounded-full text-white/40 hover:text-white/80 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 rounded-full transition-colors ${
              confirmDelete
                ? "text-red-400 bg-red-400/10"
                : "text-white/40 hover:text-red-400"
            }`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="p-3 rounded-[16px] border border-red-400/20 bg-red-400/5 flex items-center justify-between gap-3">
          <p className="text-sm text-red-300/80">Na pewno usunąć ten wpis?</p>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-white/60 hover:text-white transition-colors"
            >
              Nie
            </button>
            <button
              onClick={handleDelete}
              className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              Usuń
            </button>
          </div>
        </div>
      )}

      {/* Date */}
      <div className="echo-enter">
        <p className="text-[#A07DE0] text-sm capitalize">{formatDate(entry.date)}</p>
        <p className="text-white/30 text-xs mt-0.5">{formatTime(entry.date)}</p>
      </div>

      {/* Photo */}
      {entry.photoUrl && (
        <div className="w-full h-52 rounded-[20px] overflow-hidden border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-invert max-w-none text-white/85 text-[16px] leading-relaxed echo-enter"
        style={{ ["--enter-delay" as string]: "90ms" }}
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
    </div>
  );
}
