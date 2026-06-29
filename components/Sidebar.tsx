"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, CalendarDays, Bot, UserCircle2, FileText, Users, LayoutGrid } from "lucide-react";

const NAV_ITEMS = [
  { href: "/write", label: "Pisz", Icon: PenLine },
  { href: "/calendar", label: "Kalendarz", Icon: CalendarDays },
  { href: "/posts", label: "Posty", Icon: LayoutGrid },
  { href: "/ai", label: "Analiza AI", Icon: Bot },
  { href: "/therapists", label: "Wybierz terapeutę", Icon: Users },
  { href: "/docs", label: "API / Dokumentacja", Icon: FileText },
  { href: "/profile", label: "Profil", Icon: UserCircle2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 min-h-screen px-4 py-8 border-r border-white/10"
      style={{ background: "#0B0A14" }}
    >
      {/* Logo */}
      <div className="px-3 mb-10">
        <span className="text-xl font-bold text-white tracking-tight">Echo</span>
        <p className="text-[11px] text-white/30 mt-0.5">Twój dziennik</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors text-sm font-medium
                ${active
                  ? "bg-[#7C5CBF]/15 text-[#A07DE0]"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
            >
              <Icon
                size={18}
                className={active ? "text-[#A07DE0] drop-shadow-[0_0_6px_rgba(160,125,224,0.6)]" : ""}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
