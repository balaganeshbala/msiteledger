"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wallet,
  HardHat,
  Receipt,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyLabourLogs } from "@/hooks/useDailyLabourLogs";
import { useSiteExpenses } from "@/hooks/useSiteExpenses";
import { useClientReceipts } from "@/hooks/useClientReceipts";
import { useLabours } from "@/hooks/useLabours";
import Card from "@/components/ui/Card";
import type { ActivityItem } from "@/types";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function SiteOverviewContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const siteId = searchParams.get("id");
  const { logs, totalLabourOutflow } = useDailyLabourLogs(siteId);
  const { expenses, total: totalExpenses } = useSiteExpenses(siteId);
  const { receipts, total: totalReceipts } = useClientReceipts(siteId);
  const { labours } = useLabours();

  const netCash = totalReceipts - (totalLabourOutflow + totalExpenses);

  const labourNameById = useMemo(() => {
    const map = new Map<string, string>();
    labours.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [labours]);

  const activity: ActivityItem[] = useMemo(() => {
    const fromLogs: ActivityItem[] = logs
      .filter((l) => l.dailySalary > 0)
      .map((l) => ({
        id: `log-${l.id}`,
        type: "labour",
        date: l.date,
        title: labourNameById.get(l.labourId) ?? "Worker",
        amount: l.dailySalary,
        sign: -1,
      }));

    const fromExpenses: ActivityItem[] = expenses.map((e) => ({
      id: `exp-${e.id}`,
      type: "expense",
      date: e.date,
      title: e.title,
      amount: e.amount,
      sign: -1,
    }));

    const fromReceipts: ActivityItem[] = receipts.map((r) => ({
      id: `rcpt-${r.id}`,
      type: "receipt",
      date: r.date,
      title: r.description,
      amount: r.amount,
      sign: 1,
    }));

    return [...fromLogs, ...fromExpenses, ...fromReceipts]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);
  }, [logs, expenses, receipts, labourNameById]);

  const cards = [
    {
      label: t("totalReceipts"),
      value: totalReceipts,
      icon: Wallet,
      accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: t("labourOutflow"),
      value: totalLabourOutflow,
      icon: HardHat,
      accent: "text-orange-600 bg-orange-50 dark:bg-orange-950/40",
    },
    {
      label: t("siteExpensesCard"),
      value: totalExpenses,
      icon: Receipt,
      accent: "text-red-600 bg-red-50 dark:bg-red-950/40",
    },
    {
      label: t("netSiteCash"),
      value: netCash,
      icon: netCash >= 0 ? TrendingUp : TrendingDown,
      accent:
        netCash >= 0
          ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
          : "text-red-600 bg-red-50 dark:bg-red-950/40",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  {card.label}
                </span>
                <div className={`rounded-lg p-1.5 ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(card.value)}
              </p>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("recentActivity")}
          </h2>
        </div>

        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {activity.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {item.title}
                  </span>
                  <span className="text-xs text-slate-500">{item.date}</span>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    item.sign > 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {item.sign > 0 ? "+" : "-"}
                  {formatCurrency(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function SiteOverviewPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
      <SiteOverviewContent />
    </Suspense>
  );
}
