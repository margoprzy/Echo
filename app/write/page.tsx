"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ImagePlus, X } from "lucide-react";
import EntryEditor from "@/components/EntryEditor";
import VoiceRecorder from "@/components/VoiceRecorder";
import { saveEntry, getEntries } from "@/lib/storage";
import { getRandomQuestion } from "@/lib/questions";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { uploadPhotos, getSignedUrls, deletePhotos } from "@/lib/photos";
import type { Entry } from "@/lib/types";

function todayLabel(): string {
  return new Date().toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function NameSetupModal({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-10"
      style={{ background: "rgba(7,5,26,0.75)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-[28px] border border-white/10 space-y-5 echo-sheet"
        style={{ background: "#110E24" }}
      >
        <div>
          <h2 className="text-xl font-bold text-white">Jak masz na imię?</h2>
          <p className="text-sm text-white/40 mt-1">
            Użyjemy go do przywitania Cię w dzienniku.
          </p>
        </div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && name.trim() && onDone(name.trim())}
          placeholder="Twoje imię"
          className="w-full px-4 py-3 rounded-[14px] text-white text-sm placeholder-white/25 outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(124,92,191,0.35)",
          }}
        />
        {(() => {
          const hasName = !!name.trim();
          return (
            <button
              onClick={() => hasName && onDone(name.trim())}
              disabled={!hasName}
              className="block mx-auto py-3.5 font-semibold text-sm disabled:cursor-default active:scale-[0.98] transition-all"
              style={{
                background: hasName
                  ? "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)"
                  : "rgba(124,92,191,0.12)",
                border: hasName ? "none" : "1px solid rgba(160,125,224,0.35)",
                borderRadius: "14px",
                color: hasName ? "#fff" : "#A07DE0",
                width: "100%",
                boxShadow: "none",
                transition: "background 0.2s ease, color 0.2s ease, border 0.2s ease",
              }}
            >
              Zaczynamy
            </button>
          );
        })()}
        <div className="h-12" />
      </div>
    </div>
  );
}

/** Pozioma galeria z miniaturkami (snap scroll) + przycisk usuwania. */
function PhotoGallery({
  items,
  onRemove,
  legacyDataUrl,
  onRemoveLegacy,
}: {
  items: { path: string; url: string }[];
  onRemove: (path: string) => void;
  legacyDataUrl?: string;
  onRemoveLegacy?: () => void;
}) {
  if (!items.length && !legacyDataUrl) return null;
  return (
    <div className="-mx-5 px-5 mb-4 overflow-x-auto echo-no-scrollbar">
      <div className="flex gap-3 snap-x snap-mandatory pb-1">
        {legacyDataUrl && (
          <div className="relative shrink-0 snap-start w-[78%] max-w-[320px] aspect-[4/3] rounded-[16px] overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={legacyDataUrl} alt="" className="w-full h-full object-cover" />
            {onRemoveLegacy && (
              <button
                onClick={onRemoveLegacy}
                aria-label="Usuń zdjęcie"
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/65 hover:bg-black/85 rounded-full text-white/80"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
        {items.map((it) => (
          <div
            key={it.path}
            className="relative shrink-0 snap-start w-[78%] max-w-[320px] aspect-[4/3] rounded-[16px] overflow-hidden border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onRemove(it.path)}
              aria-label="Usuń zdjęcie"
              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-black/65 hover:bg-black/85 rounded-full text-white/80"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const { session } = useAuth();

  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [content, setContent] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  // Stary format (jeden inline base64) — zachowywany przy edycji, nie tworzymy nowych.
  const [legacyPhotoUrl, setLegacyPhotoUrl] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [userName, setUserNameState] = useState<string | null>(null);
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Ścieżki wgrane w tej sesji — przy anulowaniu/usunięciu trafią do bucketu śmieci.
  const uploadedThisSession = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (editId) {
      getEntries().then(async (rows) => {
        if (cancelled) return;
        const found = rows.find((e) => e.id === editId);
        if (found) {
          setExistingEntry(found);
          setContent(found.content);
          setLegacyPhotoUrl(found.photoUrl);
          const paths = found.photoPaths ?? [];
          setPhotoPaths(paths);
          if (paths.length) {
            const urls = await getSignedUrls(paths);
            if (!cancelled) setSignedUrls(urls);
          }
          setIsEditorOpen(true);
        }
        setInitialized(true);
      });
    } else {
      setInitialized(true);
    }
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (editId || !session) return;
    const name = (session.user?.user_metadata?.name as string | undefined) ?? null;
    setUserNameState(name);
    setShowNameSetup(!name);
  }, [session, editId]);

  async function handleNameDone(name: string) {
    setUserNameState(name);
    setShowNameSetup(false);
    await supabase.auth.updateUser({ data: { name } });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // pozwala wybrać te same pliki ponownie
    if (!files.length) return;
    setUploading(true);
    const newPaths = await uploadPhotos(files);
    if (newPaths.length) {
      uploadedThisSession.current.push(...newPaths);
      setPhotoPaths((prev) => [...prev, ...newPaths]);
      const urls = await getSignedUrls(newPaths);
      setSignedUrls((prev) => ({ ...prev, ...urls }));
    }
    setUploading(false);
  }

  function handleRemovePhoto(path: string) {
    setPhotoPaths((prev) => prev.filter((p) => p !== path));
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    // Jeśli zdjęcie zostało dodane w tej sesji i nie zapisane — wywal też z bucketu.
    if (uploadedThisSession.current.includes(path)) {
      uploadedThisSession.current = uploadedThisSession.current.filter((p) => p !== path);
      void deletePhotos([path]);
    }
  }

  async function handleSave(destination: "calendar" | "ai" = "calendar") {
    const text = content.replace(/<[^>]*>/g, "").trim();
    const hasPhoto = photoPaths.length > 0 || !!legacyPhotoUrl;
    if (!text && !hasPhoto) return;
    setSaving(true);
    const entry: Entry = existingEntry
      ? {
          ...existingEntry,
          content,
          photoUrl: legacyPhotoUrl,
          photoPaths: photoPaths.length ? photoPaths : undefined,
        }
      : {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          content,
          photoPaths: photoPaths.length ? photoPaths : undefined,
        };
    await saveEntry(entry);
    // Zapisane: zdjęcia dodane w tej sesji już są w bazie — nie kasujemy ich z bucketu.
    uploadedThisSession.current = [];
    setSaved(true);
    setTimeout(() => {
      setContent("");
      setPhotoPaths([]);
      setSignedUrls({});
      setLegacyPhotoUrl(undefined);
      setResetKey((k) => k + 1);
      setIsEditorOpen(false);
      setQuestion(null);
      setSaving(false);
      setSaved(false);
      if (destination === "ai") {
        router.push(`/ai?entry=${entry.id}`);
      } else {
        router.push("/calendar");
      }
    }, 900);
  }

  const isEditing = !!existingEntry;
  const galleryItems = photoPaths
    .map((p) => ({ path: p, url: signedUrls[p] }))
    .filter((it) => !!it.url);

  if (!initialized) return null;

  /* ── EDIT MODE ─────────────────────────────────────────────────── */
  if (isEditing) {
    return (
      <div className="px-5 pt-4 md:pt-12 pb-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Edytuj wpis</h1>
          <p className="text-sm text-[#A07DE0] mt-0.5 capitalize">
            {new Date(existingEntry!.date).toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>

        <PhotoGallery
          items={galleryItems}
          onRemove={handleRemovePhoto}
          legacyDataUrl={legacyPhotoUrl}
          onRemoveLegacy={() => setLegacyPhotoUrl(undefined)}
        />

        <div
          className="px-4 pt-4 pb-4 rounded-[20px] border border-white/10"
          style={{ background: "rgba(255,255,255,0.045)" }}
        >
          <EntryEditor
            placeholder="Napisz coś..."
            onUpdate={setContent}
            reset={resetKey}
            initialContent={existingEntry?.content}
          />
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full py-3 rounded-[16px] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: "rgba(124,92,191,0.10)",
            border: "1px solid rgba(124,92,191,0.30)",
            color: "#C4A8FF",
          }}
        >
          <ImagePlus size={16} />
          {uploading ? "Wgrywam..." : "Dodaj zdjęcie"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhoto}
        />

        <div className="h-4" />
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="w-full py-3.5 rounded-full font-semibold text-white text-sm disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
        >
          Zapisz zmiany
        </button>
      </div>
    );
  }

  /* ── CREATE MODE ───────────────────────────────────────────────── */
  return (
    <>
      {showNameSetup && <NameSetupModal onDone={handleNameDone} />}

      <div className="px-5 pt-4 md:pt-10 pb-6">

        <div className="mb-8 echo-enter">
          <h1 className="text-[28px] font-bold tracking-tight leading-tight text-white">
            Cześć {userName ?? "..."}
          </h1>
          <p className="text-sm text-white/40 capitalize mt-1">
            {todayLabel()}
          </p>
        </div>

        {/* „Zainspiruj mnie" po lewej, ikona „Dodaj zdjęcie" wypchnięta na prawą krawędź. */}
        <div className="flex items-center justify-between mb-4 echo-enter" style={{ ["--enter-delay" as string]: "90ms" }}>
          {question ? (
            <button
              onClick={() => {
                setQuestion((prev) => getRandomQuestion(prev ?? undefined));
                setTimeout(() => (document.querySelector(".ProseMirror") as HTMLElement)?.focus(), 80);
              }}
              className="flex-1 min-w-0 text-left text-[14px] leading-relaxed flex items-center justify-between gap-3 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
              style={{
                background: "rgba(124,92,191,0.09)",
                border: "1px solid rgba(124,92,191,0.2)",
                borderRadius: "16px",
                color: "#ffffff",
                padding: "14px 12px 14px 12px",
              }}
            >
              <span>{question}</span>
              <span className="shrink-0 text-[18px] leading-none" style={{ color: "#ffffff" }}>›</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setQuestion(getRandomQuestion());
                setTimeout(() => (document.querySelector(".ProseMirror") as HTMLElement)?.focus(), 80);
              }}
              className="text-[14px] font-medium text-white text-left leading-relaxed flex items-center gap-2 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
              style={{
                background: "rgba(124,92,191,0.10)",
                border: "1px solid rgba(124,92,191,0.30)",
                borderRadius: "16px",
                padding: "14px 16px 14px 12px",
              }}
            >
              <Sparkles size={15} style={{ color: "#A07DE0", flexShrink: 0 }} />
              Zainspiruj mnie
            </button>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            aria-label="Dodaj zdjęcie"
            className="shrink-0 flex items-center justify-center hover:bg-white/[0.06] active:scale-[0.96] transition-all disabled:opacity-60"
            style={{
              background: "rgba(124,92,191,0.10)",
              border: "1px solid rgba(124,92,191,0.30)",
              borderRadius: "16px",
              color: "#A07DE0",
              width: 48,
              height: 48,
            }}
          >
            {uploading ? (
              <span
                className="inline-block w-4 h-4 rounded-full border-2 border-[#A07DE0] border-t-transparent animate-spin"
                aria-hidden
              />
            ) : (
              <ImagePlus size={18} />
            )}
          </button>
        </div>

        {/* Galeria zdjęć — nad wpisem */}
        <PhotoGallery items={galleryItems} onRemove={handleRemovePhoto} />

        {/* Editor */}
        {isEditorOpen ? (
          <div
            className="relative px-4 pt-5 pb-5 rounded-[20px] border border-white/10 bg-white/[0.055] mb-4 echo-enter"
            style={{
              ["--enter-delay" as string]: "150ms",
            }}
          >
            <EntryEditor
              placeholder="Zanotuj swój dzień..."
              onUpdate={setContent}
              reset={resetKey}
              insertText={pendingTranscript}
              onInsertHandled={() => setPendingTranscript(null)}
            />
            <div className="absolute" style={{ bottom: "16px", right: "16px" }}>
              <VoiceRecorder onTranscript={(text) => setPendingTranscript(text)} />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditorOpen(true)}
            className="w-full flex items-center rounded-[20px] border border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.035] transition-all text-left mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              paddingTop: "96px",
              paddingBottom: "96px",
              paddingLeft: "20px",
              paddingRight: "20px",
            }}
          >
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
              Zanotuj swój dzień.
            </span>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePhoto}
        />

        {(() => {
          const hasContent = !!content.replace(/<[^>]*>/g, "").trim() || photoPaths.length > 0;
          if (!hasContent) return null;
          return (
            <>
              <div className="h-6" />
              <div className="flex flex-col md:flex-row items-center justify-center gap-2.5 md:gap-3">
                <button
                  onClick={() => handleSave("ai")}
                  disabled={saving || saved}
                  className="px-6 py-2.5 rounded-[14px] font-semibold text-sm text-white transition-all duration-150 active:scale-[0.96] active:brightness-90 md:hover:brightness-110 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)",
                    boxShadow: "0 8px 22px rgba(124,92,191,0.30)",
                  }}
                >
                  {saved ? "Zapisano" : "Analizuj z AI"}
                </button>
                <button
                  onClick={() => handleSave("calendar")}
                  disabled={saving || saved}
                  className="px-6 py-2.5 rounded-[14px] font-medium text-sm text-[#C4A8FF] bg-white/[0.04] border border-[#A07DE0]/40 transition-all duration-150 active:scale-[0.96] active:bg-white/[0.12] md:hover:bg-white/[0.09] md:hover:border-[#A07DE0]/70 disabled:opacity-60"
                >
                  Zapisz wpis
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={null}>
      <WriteContent />
    </Suspense>
  );
}
