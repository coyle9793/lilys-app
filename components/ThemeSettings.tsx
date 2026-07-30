"use client";

import { useEffect, useRef, useState } from "react";
import { ACCENTS, ACCENT_STORAGE_KEY, DEFAULT_ACCENT } from "@/lib/theme/accents";
import { GearIcon } from "./icons";

export default function ThemeSettings() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    return localStorage.getItem(ACCENT_STORAGE_KEY) ?? DEFAULT_ACCENT;
  });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function choose(id: string) {
    setAccent(id);
    document.documentElement.setAttribute("data-accent", id);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (private browsing etc.) — the choice just won't persist.
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Colour settings"
        aria-expanded={open}
        className="inline-flex items-center justify-center rounded-full border border-black/15 p-1.5 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        <GearIcon />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-black/10 bg-background p-3 shadow-lg dark:border-white/10">
          <p className="mb-2 text-xs font-medium text-zinc-500">Accent colour</p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => choose(a.id)}
                title={a.label}
                aria-label={a.label}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                  accent === a.id
                    ? "border-foreground"
                    : "border-black/10 dark:border-white/15"
                }`}
                style={a.swatch !== "transparent" ? { background: a.swatch } : undefined}
              >
                {a.swatch === "transparent" && <span className="text-[10px] text-zinc-500">—</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
