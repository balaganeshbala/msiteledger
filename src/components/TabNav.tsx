"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, HardHat, BookUser } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TabNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const tabs = [
    { href: "/sites", label: t("sites"), icon: Building2 },
    { href: "/labour", label: t("dailyLabour"), icon: HardHat },
    { href: "/directory", label: t("directory"), icon: BookUser },
  ];

  return (
    <nav className="sticky top-[57px] z-10 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex gap-1 overflow-x-auto px-2 sm:px-4">
        {tabs.map((tab) => {
          const active =
            tab.href === "/sites"
              ? pathname.startsWith("/sites") || pathname.startsWith("/site")
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
