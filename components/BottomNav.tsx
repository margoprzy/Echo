"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, BookOpen, CalendarDays } from "lucide-react";

const NAV_ITEMS = [
  { href: "/write", label: "Pisz", Icon: PenLine },
  { href: "/entries", label: "Wpisy", Icon: BookOpen },
  { href: "/calendar", label: "Kalendarz", Icon: CalendarDays },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-[72px] border-t border-white/10 bg-[#0B0A14]/90 backdrop-blur-xl max-w-[430px] mx-auto">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors"
          >
            <Icon
              size={22}
              className={
                active
                  ? "text-[#A07DE0] drop-shadow-[0_0_8px_rgba(160,125,224,0.7)]"
                  : "text-white/40"
              }
            />
            <span
              className={`text-[11px] font-medium ${
                active ? "text-[#A07DE0]" : "text-white/30"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
