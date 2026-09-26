"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDailyLabourLogs } from "@/hooks/useDailyLabourLogs";
import { useLabours } from "@/hooks/useLabours";
import {
  getWeekStartDate,
  getWeekDates,
  todayDateString,
  WEEKDAY_KEYS,
} from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import type { TranslationKey } from "@/lib/translations";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function SiteLabourContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const siteId = searchParams.get("id");
  const { logs, totalLabourOutflow } = useDailyLabourLogs(siteId);
  const { labours } = useLabours();

  const labourNameById = useMemo(() => {
    const map = new Map<string, string>();
    labours.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [labours]);

  const perWorker = useMemo(() => {
    const byLabour = new Map<string, { labourId: string; totalSalary: number }>();
    for (const log of logs) {
      const existing = byLabour.get(log.labourId);
      byLabour.set(log.labourId, {
        labourId: log.labourId,
        totalSalary: (existing?.totalSalary ?? 0) + log.dailySalary,
      });
    }
    return Array.from(byLabour.values()).sort((a, b) =>
      (labourNameById.get(a.labourId) ?? "").localeCompare(
        labourNameById.get(b.labourId) ?? ""
      )
    );
  }, [logs, labourNameById]);

  const [weekAnchorDate, setWeekAnchorDate] = useState(todayDateString());
  const weekStartDate = useMemo(
    () => getWeekStartDate(weekAnchorDate),
    [weekAnchorDate]
  );
  const weekDates = useMemo(
    () => getWeekDates(weekStartDate),
    [weekStartDate]
  );

  const weeklyRows = useMemo(() => {
    const weekLogs = logs.filter((l) => l.weekStartDate === weekStartDate);
    const byLabour = new Map<string, { labourId: string; total: number }>();
    for (const log of weekLogs) {
      const existing = byLabour.get(log.labourId);
      byLabour.set(log.labourId, {
        labourId: log.labourId,
        total: (existing?.total ?? 0) + log.dailySalary,
      });
    }
    return Array.from(byLabour.values()).sort((a, b) =>
      (labourNameById.get(a.labourId) ?? "").localeCompare(
        labourNameById.get(b.labourId) ?? ""
      )
    );
  }, [logs, weekStartDate, labourNameById]);

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20),
    [logs]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          {t("viewOnlyLabourNote")}{" "}
          <Link href="/labour" className="font-medium text-orange-600 underline">
            {t("dailyLabour")}
          </Link>
        </span>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("labourWorkers")}
          </h2>
          <span className="text-sm font-bold text-orange-600">
            {formatCurrency(totalLabourOutflow)}
          </span>
        </div>

        {perWorker.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {perWorker.map((row) => (
              <li
                key={row.labourId}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {labourNameById.get(row.labourId) ?? "Worker"}
                </span>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{t("labourOutflow")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(row.totalSalary)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("weeklyMatrix")}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">
              {t("weekOf")}
            </label>
            <input
              type="date"
              value={weekAnchorDate}
              onChange={(e) => setWeekAnchorDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {weeklyRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("workerName")}</th>
                  {weekDates.map((date, i) => (
                    <th key={date} className="py-2 pr-3">
                      <div>{t(WEEKDAY_KEYS[i] as TranslationKey)}</div>
                      <div className="font-normal text-slate-400">{date}</div>
                    </th>
                  ))}
                  <th className="py-2 pr-3">{t("labourOutflow")}</th>
                </tr>
              </thead>
              <tbody>
                {weeklyRows.map((row) => (
                  <tr
                    key={row.labourId}
                    className="border-b border-slate-50 dark:border-slate-900"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                      {labourNameById.get(row.labourId) ?? "Worker"}
                    </td>
                    {weekDates.map((date) => {
                      const log = logs.find(
                        (l) => l.labourId === row.labourId && l.date === date
                      );
                      return (
                        <td key={date} className="py-2 pr-3">
                          {log ? formatCurrency(log.dailySalary) : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 font-semibold">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          {t("expenseList")}
        </h2>
        {recentLogs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("date")}</th>
                  <th className="py-2 pr-3">{t("workerName")}</th>
                  <th className="py-2 pr-3">{t("dailySalary")}</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-slate-50 dark:border-slate-900"
                  >
                    <td className="py-2 pr-3 text-xs text-slate-500">
                      {log.date}
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                      {labourNameById.get(log.labourId) ?? "Worker"}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {formatCurrency(log.dailySalary)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function SiteLabourPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
      <SiteLabourContent />
    </Suspense>
  );
}
