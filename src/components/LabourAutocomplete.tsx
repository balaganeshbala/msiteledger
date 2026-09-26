"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Labour } from "@/types";

export default function LabourAutocomplete({
  labours,
  selectedId,
  onSelect,
}: {
  labours: Labour[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = labours.find((l) => l.id === selectedId) ?? null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = labours.filter((l) => l.isActive);
    if (!q) return pool;
    return pool.filter((l) => l.name.toLowerCase().includes(q));
  }, [labours, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {t("selectLabour")}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={open ? query : selected?.name ?? query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={t("searchLabour")}
          className="w-full rounded-lg border border-slate-300 bg-white px-9 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {open && (
        <div className="absolute top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-slate-500">
              {t("noLabourFound")}
            </p>
          ) : (
            results.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  onSelect(l.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {l.name}
                </span>
                <span className="ml-auto text-xs text-slate-500">
                  ₹{l.dailyRate}/day
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
