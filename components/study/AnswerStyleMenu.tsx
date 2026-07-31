"use client";

import { useEffect, useRef, useState } from "react";
import { DotsIcon } from "@/components/icons";

export type AnswerStyle = "ranking" | "swipe";

export default function AnswerStyleMenu({
  value,
  onChange,
}: {
  value: AnswerStyle;
  onChange: (style: AnswerStyle) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function choose(style: AnswerStyle) {
    onChange(style);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Answer style options"
        aria-expanded={open}
        className="rounded-full border border-black/15 p-1.5 text-zinc-500 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        <DotsIcon />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-60 rounded-lg border border-black/10 bg-background p-1.5 shadow-lg dark:border-white/10">
          <button
            onClick={() => choose("ranking")}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
              value === "ranking" ? "bg-black/5 font-medium dark:bg-white/10" : ""
            }`}
          >
            Ranking
            <span className="block text-xs text-zinc-500">Again / Hard / Good / Easy buttons</span>
          </button>
          <button
            onClick={() => choose("swipe")}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
              value === "swipe" ? "bg-black/5 font-medium dark:bg-white/10" : ""
            }`}
          >
            Swipe
            <span className="block text-xs text-zinc-500">← wrong, → right (arrow keys)</span>
          </button>
        </div>
      )}
    </div>
  );
}
