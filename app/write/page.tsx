"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera } from "lucide-react";
import EntryEditor from "@/components/EntryEditor";
import { saveEntry, getEntries, getUserName, setUserName } from "@/lib/storage";
import { getRandomQuestion } from "@/lib/questions";
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
      className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-10"
      style={{ background: "rgba(7,5,26,0.75)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="w-full max-w-sm p-6 rounded-[28px] border border-white/10 space-y-5"
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
        <button
          onClick={() => name.trim() && onDone(name.trim())}
          className="w-full py-3.5 rounded-full font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
        >
          Zaczynamy
        </button>
      </div>
    </div>
  );
}

function WriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [existingEntry, setExistingEntry] = useState<Entry | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [userName, setUserNameState] = useState<string | null>(null);
  const [showNameSetup, setShowNameSetup] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const name = getUserName();
    if (editId) {
      const found = getEntries().find((e) => e.id === editId);
      if (found) {
        setExistingEntry(found);
        setContent(found.content);
        setPhotoUrl(found.photoUrl);
        setIsEditorOpen(true);
      }
    } else if (!name) {
      setShowNameSetup(true);
    }
    setUserNameState(name);
    setInitialized(true);
  }, [editId]);

  function handleNameDone(name: string) {
    setUserName(name);
    setUserNameState(name);
    setShowNameSetup(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const text = content.replace(/<[^>]*>/g, "").trim();
    if (!text && !photoUrl) return;
    setSaving(true);
    const entry: Entry = existingEntry
      ? { ...existingEntry, content, photoUrl }
      : { id: crypto.randomUUID(), date: new Date().toISOString(), content, photoUrl };
    saveEntry(entry);
    setContent("");
    setPhotoUrl(undefined);
    setResetKey((k) => k + 1);
    setIsEditorOpen(false);
    setQuestion(null);
    setSaving(false);
    if (existingEntry) {
      router.push(`/entries/${existingEntry.id}`);
    } else {
      router.push("/entries");
    }
  }

  const isEditing = !!existingEntry;

  if (!initialized) return null;

  /* ── EDIT MODE ─────────────────────────────────────────────────── */
  if (isEditing) {
    return (
      <div className="px-5 pt-12 pb-6 space-y-4">
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

        {photoUrl && (
          <div className="relative w-full h-40 rounded-[16px] overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => setPhotoUrl(undefined)}
              className="absolute top-2 right-2 bg-black/60 rounded-full py-1 px-3 text-white/60 hover:text-white text-xs"
            >
              Usuń
            </button>
          </div>
        )}

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full py-3 rounded-[16px] text-sm font-medium"
          style={{
            background: "rgba(52,211,153,0.08)",
            border: "1px solid rgba(52,211,153,0.18)",
            color: "#34D399",
          }}
        >
          Dodaj zdjęcie
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

        <div className="h-4" />
        <button
          onClick={handleSave}
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

      <div className="px-5 pt-10 pb-6">

        {/* Header: greeting + date below */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight leading-tight text-white">
            Cześć {userName ?? "..."}
          </h1>
          <p className="text-sm text-white/40 capitalize mt-1">
            {todayLabel()}
          </p>
        </div>

        {/* Zainspiruj mnie — button or revealed question */}
        {question ? (
          <button
            onClick={() => setQuestion((prev) => getRandomQuestion(prev ?? undefined))}
            className="w-full mb-4 text-left text-[14px] leading-relaxed flex items-center justify-between gap-3 hover:bg-white/[0.06] active:scale-[0.98] transition-all"
            style={{
              background: "rgba(124,92,191,0.09)",
              border: "1px solid rgba(124,92,191,0.2)",
              borderRadius: "16px",
              color: "rgba(255,255,255,0.68)",
              padding: "14px 12px 14px 12px",
            }}
          >
            <span>{question}</span>
            <span className="shrink-0 text-[18px] leading-none" style={{ color: "rgba(160,125,224,0.6)" }}>›</span>
          </button>
        ) : (
          <button
            onClick={() => setQuestion(getRandomQuestion())}
            className="w-full mb-4 text-[14px] font-medium text-white/80 text-left leading-relaxed hover:bg-white/[0.06] active:scale-[0.98] transition-all"
            style={{
              background: "rgba(124,92,191,0.10)",
              border: "1px solid rgba(124,92,191,0.30)",
              borderRadius: "16px",
              padding: "14px 28px 14px 12px",
            }}
          >
            Zainspiruj mnie
          </button>
        )}

        {/* Editor — collapsed or open */}
        {isEditorOpen ? (
          <div
            className="relative px-4 pt-5 pb-5 rounded-[20px] border border-white/20 mb-4"
            style={{
              background: "#0F0C21",
            }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute top-2 right-2 p-3 rounded-xl transition-colors hover:bg-white/[0.10]"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              <Camera size={22} />
            </button>
            <EntryEditor
              placeholder="Zanotuj swój dzień..."
              onUpdate={setContent}
              reset={resetKey}
            />
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

        {/* Photo preview */}
        {photoUrl && (
          <div className="relative w-full h-40 rounded-[16px] overflow-hidden border border-white/10 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => setPhotoUrl(undefined)}
              className="absolute top-2 right-2 bg-black/60 rounded-full py-1 px-3 text-white/60 hover:text-white text-xs"
            >
              Usuń
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />

        {/* Save */}
        <div className="h-6" />
        {(() => {
          const hasContent = !!content.replace(/<[^>]*>/g, "").trim() || !!photoUrl;
          return (
            <button
              onClick={handleSave}
              disabled={saving}
              className="block mx-auto py-3.5 font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-all"
              style={{
                background: hasContent
                  ? "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)"
                  : "rgba(124,92,191,0.12)",
                border: hasContent
                  ? "none"
                  : "1px solid rgba(160,125,224,0.35)",
                borderRadius: "14px",
                color: hasContent ? "#fff" : "#A07DE0",
                paddingLeft: "24px",
                paddingRight: "24px",
                width: "40%",
                boxShadow: "none",
              }}
            >
              Zapisz wpis
            </button>
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
