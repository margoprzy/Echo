"use client";

import { useEffect, useState } from "react";

export interface DocsNavGroup {
  title: string;
  items: { id: string; label: string }[];
}

/**
 * Boczna nawigacja dokumentacji (scrollspy + płynne przewijanie).
 * Grupy renderowane kolejno: najpierw API, potem MCP — jak w standardowej dokumentacji.
 */
export default function DocsNav({ groups }: { groups: DocsNavGroup[] }) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [groups]);

  function go(e: React.MouseEvent, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
      history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <nav className="space-y-5 text-sm">
      {groups.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[#A07DE0]">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={(e) => go(e, item.id)}
                    className={`block px-2 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                      isActive
                        ? "bg-[#7C5CBF]/20 text-white font-medium"
                        : "text-white/50 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
