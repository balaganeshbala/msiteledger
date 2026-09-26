"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { ArrowLeft, LayoutDashboard, Receipt, Wallet, HardHat } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import NetCashBadge from "@/components/NetCashBadge";

function SiteDetailLayoutContent({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { sites, loading } = useSiteContext();

  const siteId = searchParams.get("id") ?? "";
  const site = sites.find((s) => s.id === siteId) ?? null;

  const query = `?id=${siteId}`;
  const tabs = [
    { href: `/site${query}`, label: t("overview"), icon: LayoutDashboard, exact: true },
    { href: `/site/expenses${query}`, label: t("siteExpenses"), icon: Receipt },
    { href: `/site/receipts${query}`, label: t("clientReceipts"), icon: Wallet },
    { href: `/site/labour${query}`, label: t("labourExpenses"), icon: HardHat },
  ];

  if (loading) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-slate-500">{t("noData")}</p>
        <Link
          href="/sites"
          className="flex items-center gap-1.5 text-sm font-medium text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToSites")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <Link
          href="/sites"
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-orange-600"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToSites")}
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {site.siteName}
            </h1>
            {site.clientName && (
              <p className="text-sm text-slate-500">{site.clientName}</p>
            )}
          </div>
          <NetCashBadge siteId={siteId} />
        </div>
      </div>

      <nav className="-mx-4 border-b border-slate-200 px-4 dark:border-slate-800 sm:-mx-6 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const tabPath = tab.href.split("?")[0];
            const active = tab.exact
              ? pathname === tabPath
              : pathname.startsWith(tabPath);
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

      {children}
    </div>
  );
}

export default function SiteDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
      <SiteDetailLayoutContent>{children}</SiteDetailLayoutContent>
    </Suspense>
  );
}
