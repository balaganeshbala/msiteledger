"use client";

import { WifiOff } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

/**
 * The app is online-only: Firestore's persistent cache is just for faster
 * loads, so while offline this blocks the whole UI rather than letting edits
 * queue up silently on the device.
 */
export default function OfflineOverlay() {
  const { t } = useLanguage();
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50/95 p-4 dark:bg-slate-950/95"
    >
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
          <WifiOff className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          {t("offlineTitle")}
        </h2>
        <p className="text-sm text-slate-500">{t("offlineMessage")}</p>
      </div>
    </div>
  );
}
