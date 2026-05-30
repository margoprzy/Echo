import Link from "next/link";
import type { Entry } from "@/lib/types";
import Image from "next/image";

interface EntryCardProps {
  entry: Entry;
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

export default function EntryCard({ entry }: EntryCardProps) {
  const excerpt = stripHtml(entry.content).slice(0, 120);

  return (
    <Link
      href={`/entries/${entry.id}`}
      className="flex gap-3 p-4 rounded-[20px] border border-white/10 bg-white/[0.055] hover:bg-white/[0.09] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#A07DE0] mb-1.5 capitalize">{formatDate(entry.date)}</p>
        <p className="text-white/75 text-sm leading-relaxed line-clamp-2">
          {excerpt || <span className="text-white/30 italic">Brak tekstu</span>}
        </p>
      </div>
      {entry.photoUrl && (
        <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/10">
          <Image
            src={entry.photoUrl}
            alt=""
            width={56}
            height={56}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </Link>
  );
}
