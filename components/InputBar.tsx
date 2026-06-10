"use client";

import { Mic } from "lucide-react";

export default function InputBar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 max-w-[430px] mx-auto px-4 pb-5 pt-3"
      style={{ background: "transparent" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-1 flex items-center px-4 py-3 rounded-full"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <span className="text-sm select-none" style={{ color: "rgba(255,255,255,0.22)" }}>
            Napisz lub nagraj...
          </span>
        </div>
        <button
          className="flex-shrink-0 flex items-center justify-center rounded-full active:scale-95 transition-all"
          style={{
            width: 44,
            height: 44,
            background: "rgba(124,92,191,0.18)",
            border: "1px solid rgba(124,92,191,0.35)",
          }}
        >
          <Mic size={18} color="#A07DE0" />
        </button>
      </div>
    </div>
  );
}
