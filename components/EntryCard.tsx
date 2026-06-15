import Link from "next/link";
import type { Entry } from "@/lib/types";
import Image from "next/image";

interface EntryCardProps {
  entry: Entry;
  /** Signed URL pierwszego zdjęcia z bucketu (jeśli wpis ma photoPaths). */
  thumbUrl?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function EntryCard({ entry, thumbUrl }: EntryCardProps) {
  const excerpt = stripHtml(entry.content).slice(0, 120);
  const photoCount = entry.photoPaths?.length ?? 0;
  const thumb = thumbUrl ?? entry.photoUrl;

  return (
    <Link
      href={`/entries/${entry.id}`}
      className="flex gap-3 p-4 rounded-[20px] border border-white/10 bg-white/[0.055] hover:bg-white/[0.09] hover:-translate-y-0.5 hover:border-white/20 active:scale-[0.985] transition-all duration-200"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#A07DE0] mb-1.5 capitalize">{formatDate(entry.date)}</p>
        <p className="text-white/75 text-sm leading-relaxed line-clamp-2">
          {excerpt || <span className="text-white/30 italic">Brak tekstu</span>}
        </p>
      </div>
      {thumb && (
        <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10">
          <Image
            src={thumb}
            alt=""
            width={56}
            height={56}
            unoptimized={thumbUrl ? true : false}
            className="w-full h-full object-cover"
          />
          {photoCount > 1 && (
            <span className="absolute bottom-0.5 right-0.5 px-1 rounded-full bg-black/70 text-[10px] text-white/90 leading-tight">
              +{photoCount - 1}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
