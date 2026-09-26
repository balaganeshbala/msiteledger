"use client";

import { HardHat, Languages, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Header() {
  const { logout } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
            <HardHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900 sm:inline dark:text-white">
            {t("appName")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            title="Toggle language"
          >
            <Languages className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {language === "en" ? "தமிழ்" : "EN"}
            </span>
          </button>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            title={t("logout")}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
