"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { getEntries, deleteEntry } from "@/lib/storage";
import { getSignedUrlsOrdered, deletePhotos } from "@/lib/photos";
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
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEntries().then(async (rows) => {
      if (cancelled) return;
      const found = rows.find((e) => e.id === id) ?? null;
      setEntry(found);
      if (found?.photoPaths?.length) {
        const urls = await getSignedUrlsOrdered(found.photoPaths);
        if (!cancelled) setPhotoUrls(urls);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    // Najpierw sprzątamy bucket — RLS pozwoli zalogowanemu właścicielowi.
    if (entry?.photoPaths?.length) {
      await deletePhotos(entry.photoPaths);
    }
    await deleteEntry(id);
    router.push("/calendar");
  }

  if (!entry) {
    return (
      <div className="px-5 pt-3 md:pt-12 text-white/40 text-sm">Ładowanie...</div>
    );
  }

  return (
    <>
      {/* Mobile top bar — back / title / delete (matches the shared bar) */}
      <header
        className="md:hidden fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex items-center justify-center"
        style={{
          height: "calc(env(safe-area-inset-top, 0px) + 56px)",
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: "transparent",
        }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Wstecz"
          className="absolute left-2 w-12 h-12 flex items-center justify-center rounded-full text-white active:bg-white/10 transition-colors"
          style={{ marginLeft: "env(safe-area-inset-left, 0px)" }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-[17px] font-semibold text-white tracking-tight">Wpis</h1>
        <button
          onClick={handleDelete}
          aria-label="Usuń wpis"
          className={`absolute right-2 w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
            confirmDelete ? "text-red-400" : "text-white/70 active:bg-white/10"
          }`}
          style={{ marginRight: "env(safe-area-inset-right, 0px)" }}
        >
          <Trash2 size={20} />
        </button>
      </header>

      <div className="px-5 pt-3 md:pt-12 pb-6 space-y-5">
        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            Wstecz
          </button>
          <button
            onClick={handleDelete}
            className={`p-2 rounded-full transition-colors ${
              confirmDelete ? "text-red-400 bg-red-400/10" : "text-white/40 hover:text-red-400"
            }`}
          >
            <Trash2 size={16} />
          </button>
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

        {/* Galeria zdjęć — pozioma. Stare wpisy mają photoUrl (base64). */}
        {entry.photoUrl && photoUrls.length === 0 && (
          <div className="w-full h-52 rounded-[20px] overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.photoUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {photoUrls.length > 0 && (
          <div className="-mx-5 px-5 overflow-x-auto echo-no-scrollbar">
            <div className="flex gap-3 snap-x snap-mandatory pb-1">
              {photoUrls.map((url, i) => (
                <div
                  key={url + i}
                  className="shrink-0 snap-start w-[82%] max-w-[420px] aspect-[4/3] rounded-[20px] overflow-hidden border border-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-invert max-w-none text-white/85 text-[16px] leading-relaxed echo-enter"
          style={{ ["--enter-delay" as string]: "90ms" }}
          dangerouslySetInnerHTML={{ __html: entry.content }}
        />

        {/* Analyze with AI — below the entry */}
        <button
          onClick={() => router.push(`/ai?entry=${entry.id}`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] font-semibold text-sm text-white active:scale-[0.98] transition-all echo-enter"
          style={{
            background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
            boxShadow: "0 8px 22px rgba(124,92,191,0.35)",
            ["--enter-delay" as string]: "120ms",
          }}
        >
          <Sparkles size={16} />
          Analizuj z AI
        </button>
      </div>
    </>
  );
}
