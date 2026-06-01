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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 max-w-[430px] mx-auto pointer-events-none">
      <nav
        className="pointer-events-auto flex justify-around items-center gap-1 px-2 py-2 rounded-[26px] border border-white/10 backdrop-blur-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(45,33,79,0.88) 0%, rgba(26,20,48,0.9) 100%)",
          boxShadow:
            "0 8px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all duration-300 active:scale-95 ${
                active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]"
              }`}
            >
              <Icon
                key={active ? pathname : undefined}
                size={22}
                className={`${active ? "text-[#A07DE0] echo-nav-bounce" : "text-white"}`}
              />
              <span
                className={`text-[11px] font-medium ${
                  active ? "text-[#A07DE0]" : "text-white"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
