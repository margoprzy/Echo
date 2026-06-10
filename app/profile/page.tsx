"use client";

import Link from "next/link";
import { LogOut, UserCircle2, FileText } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function ProfilePage() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? "—";

  return (
    <div className="px-5 pt-4 md:pt-12 pb-6 space-y-6">
      <div className="hidden md:block echo-enter">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Profil</h1>
        <p className="text-sm text-white/40 mt-0.5">Twoje konto</p>
      </div>

      <div
        className="p-5 rounded-[20px] border border-white/10 flex items-center gap-4 echo-enter"
        style={{ background: "rgba(255,255,255,0.04)", ["--enter-delay" as string]: "90ms" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7C5CBF 0%, #A07DE0 100%)" }}
        >
          <UserCircle2 size={26} className="text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-white/40">Zalogowana jako</p>
          <p className="text-sm text-white/90 truncate">{email}</p>
        </div>
      </div>

      {/* Dostęp do API i dokumentacji */}
      <Link
        href="/docs"
        className="p-5 rounded-[20px] border border-white/10 flex items-center gap-4 echo-enter hover:bg-white/[0.06] transition-colors"
        style={{ background: "rgba(255,255,255,0.04)", ["--enter-delay" as string]: "130ms" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(124,92,191,0.18)", border: "1px solid rgba(160,125,224,0.35)" }}
        >
          <FileText size={22} className="text-[#A07DE0]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-white/90">API i dokumentacja</p>
          <p className="text-xs text-white/40">Klucze API oraz opis endpointów dla deweloperów</p>
        </div>
      </Link>

      <button
        onClick={() => signOut()}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-medium text-sm text-white/70 hover:text-white active:scale-[0.98] transition-all echo-enter"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.12)",
          ["--enter-delay" as string]: "170ms",
        }}
      >
        <LogOut size={16} />
        Wyloguj się
      </button>
    </div>
  );
}
