"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { LayoutGrid, Loader2, ImagePlus, X } from "lucide-react";

interface Post {
  id: number;
  documentId: string;
  title: string;
  content: string; // HTML
  entryDate: string | null;
  createdAt: string;
  imageUrls: string[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function PostBody({ html }: { html: string }) {
  const clean = useMemo(() => DOMPurify.sanitize(html), [html]);
  return (
    <div
      className="echo-post-body text-sm text-white/70 mt-2 [&_p]:mb-2 [&_a]:text-[#A07DE0] [&_strong]:text-white"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Nie udało się pobrać postów ze Strapi.");
        setPosts([]);
      } else {
        setPosts(body.posts ?? []);
      }
    } catch (e) {
      setError(String(e));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function pickCover(file: File | null) {
    setCoverFile(file);
    setCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("content", content.trim());
      if (coverFile) form.append("cover", coverFile);
      const res = await fetch("/api/posts", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.message ?? "Nie udało się dodać posta.");
      } else {
        setTitle("");
        setContent("");
        pickCover(null);
        if (fileRef.current) fileRef.current.value = "";
        await load();
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-3 pb-10 max-w-3xl mx-auto">
      {/* Header — desktop */}
      <div className="hidden md:flex items-center gap-2">
        <LayoutGrid size={20} style={{ color: "#A07DE0" }} />
        <h1 className="text-2xl font-semibold text-white tracking-tight">Posty</h1>
      </div>
      <p className="text-sm text-white/50 mt-2 md:mt-3">
        Treści z CMS Strapi. Dodasz post tutaj — pojawi się w panelu Strapi. Dodasz w Strapi —
        pojawi się tutaj. Zdjęcia trzymane są w Supabase Storage.
      </p>

      {/* Formularz dodawania */}
      <form
        onSubmit={submit}
        className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł posta"
          className="w-full bg-transparent text-white text-lg font-medium placeholder-white/30 outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Treść posta…"
          rows={4}
          className="w-full bg-transparent text-white/90 placeholder-white/30 outline-none resize-y"
        />

        {coverPreview && (
          <div className="relative w-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="podgląd" className="rounded-lg w-40 h-28 object-cover" />
            <button
              type="button"
              onClick={() => {
                pickCover(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="absolute -top-2 -right-2 bg-black/70 rounded-full p-1 text-white/80 hover:text-white"
              aria-label="Usuń zdjęcie"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90 cursor-pointer">
            <ImagePlus size={18} />
            {coverFile ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40 transition-colors"
            style={{ background: "#7C5CBF" }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Dodaję…" : "Dodaj post"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Lista postów */}
      <div className="mt-8 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 size={16} className="animate-spin" /> Ładuję posty…
          </div>
        ) : posts.length === 0 && !error ? (
          <p className="text-white/40 text-sm">
            Brak postów. Dodaj pierwszy powyżej lub w panelu Strapi.
          </p>
        ) : (
          posts.map((p) => (
            <article
              key={p.documentId}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <h2 className="text-lg font-semibold text-white">{p.title}</h2>
              <p className="text-[11px] text-white/30 mt-0.5">
                {formatDate(p.entryDate ?? p.createdAt)}
              </p>
              {p.content && <PostBody html={p.content} />}
              {p.imageUrls.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto">
                  {p.imageUrls.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={p.title}
                      className="h-44 rounded-xl object-cover shrink-0"
                    />
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
