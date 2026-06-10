"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, PenLine, CalendarDays, Bot, UserCircle2, FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/write", label: "Pisz", Icon: PenLine },
  { href: "/calendar", label: "Kalendarz", Icon: CalendarDays },
  { href: "/ai", label: "Analiza AI", Icon: Bot },
  { href: "/docs", label: "API / Dokumentacja", Icon: FileText },
  { href: "/profile", label: "Profil", Icon: UserCircle2 },
];

const TITLES: Record<string, string> = {
  "/write": "Pisz",
  "/calendar": "Kalendarz",
  "/ai": "Analiza AI",
  "/docs": "API / Dokumentacja",
  "/profile": "Profil",
  "/entries": "Wpisy",
};

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (pathname === "/login") return null;

  // Szczegóły wpisu mają własny pasek z przyciskiem „wstecz".
  const isEntryDetail = pathname.startsWith("/entries/");
  const title = TITLES[pathname] ?? "Echo";

  return (
    <div className="md:hidden">
      {/* Górny pasek — hamburger po lewej + wyśrodkowany tytuł (jak ChatGPT) */}
      {!isEntryDetail && (
        <header
          className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 flex items-center justify-center"
          style={{
            height: "calc(env(safe-area-inset-top, 0px) + 56px)",
            paddingTop: "env(safe-area-inset-top, 0px)",
            background: "transparent",
          }}
        >
          <button
            onClick={() => setOpen(true)}
            aria-label="Otwórz menu"
            className="absolute left-2 flex items-center justify-center w-12 h-12 rounded-full text-white active:bg-white/10 transition-colors"
            style={{ marginLeft: "env(safe-area-inset-left, 0px)" }}
          >
            <Menu size={24} />
          </button>
          <h1 className="text-[17px] font-semibold text-white tracking-tight">{title}</h1>
        </header>
      )}

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[90] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: "rgba(7,5,26,0.6)" }}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-[100] w-72 max-w-[80%] px-4 pb-6 border-r border-white/10 transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "#0B0A14",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        }}
      >
        <div className="flex items-center justify-between px-2 mb-8">
          <div>
            <span className="text-xl font-bold text-white tracking-tight">Echo</span>
            <p className="text-[11px] text-white/30 mt-0.5">Twój dziennik</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Zamknij menu"
            className="flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-white/50 hover:text-white/90 active:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-[14px] transition-colors ${
                  active
                    ? "bg-[#7C5CBF]/20 text-[#C4A8FF]"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
