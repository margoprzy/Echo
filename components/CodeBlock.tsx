"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { copyText } from "@/lib/clipboard";

/** Blok kodu z przyciskiem kopiowania — używany w dokumentacji API. */
export default function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="relative group">
      {lang && (
        <span className="absolute top-2.5 left-3 text-[10px] uppercase tracking-wider text-white/30">
          {lang}
        </span>
      )}
      <button
        onClick={copy}
        aria-label="Kopiuj"
        className="absolute top-2 right-2 flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white active:bg-white/10 transition-colors"
      >
        {copied ? <Check size={15} className="text-[#34D399]" /> : <Copy size={15} />}
      </button>
      <pre
        className="overflow-x-auto rounded-[14px] p-4 pt-8 text-[12.5px] leading-relaxed font-mono text-white/85"
        style={{ background: "#0B0A14", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
