"use client";

import { useState, useEffect, useMemo } from "react";
import { Save, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import { useLabours } from "@/hooks/useLabours";
import { useLabourLedger } from "@/hooks/useLabourLedger";
import {
  getWeekStartDate,
  getWeekDates,
  computeEntry,
  todayDateString,
  WEEKDAY_KEYS,
} from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import LabourAutocomplete from "@/components/LabourAutocomplete";
import type { TranslationKey } from "@/lib/translations";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function LabourPage() {
  const { t } = useLanguage();
  const { sites, loading: sitesLoading } = useSiteContext();
  const { labours } = useLabours();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  useEffect(() => {
    if (sitesLoading) return;
    const stillExists = sites.some((s) => s.id === selectedSiteId);
    if (!selectedSiteId || !stillExists) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- defaults the form's site once the live sites list loads or the previous selection disappears
      setSelectedSiteId(sites[0]?.id ?? null);
    }
  }, [sites, sitesLoading, selectedSiteId]);

  const siteNameById = useMemo(() => {
    const map = new Map<string, string>();
    sites.forEach((s) => map.set(s.id, s.siteName));
    return map;
  }, [sites]);

  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [selectedLabourId, setSelectedLabourId] = useState<string | null>(
    null
  );
  const [workedToday, setWorkedToday] = useState(true);
  const [extraAdvance, setExtraAdvance] = useState("0");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const { logs: labourLogs, saveEntry } = useLabourLedger(selectedLabourId);

  const selectedLabour = labours.find((l) => l.id === selectedLabourId) ?? null;

  useEffect(() => {
    if (!selectedLabourId) return;
    const existing = labourLogs.find((l) => l.date === selectedDate);
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form once Firestore confirms an entry exists for this day
      setWorkedToday(existing.workedToday);
      setExtraAdvance(String(existing.extraAdvance));
      if (existing.siteId) setSelectedSiteId(existing.siteId);
    } else {
      setWorkedToday(true);
      setExtraAdvance("0");
    }
  }, [selectedLabourId, selectedDate, labourLogs]);

  const previousBalance = useMemo(() => {
    const prior = labourLogs
      .filter((l) => l.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    return prior.length ? prior[0].runningBalance : 0;
  }, [labourLogs, selectedDate]);

  const advanceValue = Number(extraAdvance) || 0;
  const preview = selectedLabour
    ? computeEntry(
        workedToday,
        selectedLabour.dailyRate,
        advanceValue,
        previousBalance
      )
    : null;

  const weekStartDate = getWeekStartDate(selectedDate);
  const weekDates = getWeekDates(weekStartDate);

  function balanceAsOf(date: string): number {
    const rows = labourLogs
      .filter((l) => l.date <= date)
      .sort((a, b) => b.date.localeCompare(a.date));
    return rows.length ? rows[0].runningBalance : 0;
  }

  const canSave = workedToday ? Boolean(selectedSiteId) : true;

  const handleSave = async () => {
    if (!selectedLabourId || !selectedLabour || !canSave) return;
    setSaving(true);
    try {
      await saveEntry({
        labourId: selectedLabourId,
        date: selectedDate,
        workedToday,
        siteId: workedToday ? selectedSiteId : null,
        extraAdvance: advanceValue,
        dailyRate: selectedLabour.dailyRate,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        {t("dailyLabourEntry")}
      </h1>

      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("date")}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("site")}
            </label>
            {workedToday ? (
              <select
                value={selectedSiteId ?? ""}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {sites.length === 0 && <option value="">—</option>}
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteName}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex w-full items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                {t("anySite")}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <LabourAutocomplete
              labours={labours}
              selectedId={selectedLabourId}
              onSelect={setSelectedLabourId}
            />
          </div>
        </div>

        {selectedLabour && (
          <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <Switch
              checked={workedToday}
              onChange={setWorkedToday}
              label={t("workedToday")}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("extraAdvance")}
              </label>
              <input
                type="number"
                min={0}
                value={extraAdvance}
                onChange={(e) => setExtraAdvance(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            {preview && (
              <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                <div>
                  <p className="text-xs text-slate-500">{t("dailySalary")}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(preview.dailySalary)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {t("totalCashPaid")}
                  </p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {formatCurrency(preview.totalCashPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    {t("runningBalance")}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      preview.runningBalance >= 0
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(preview.runningBalance)}
                  </p>
                </div>
              </div>
            )}

            <Button onClick={handleSave} loading={saving} disabled={!canSave} fullWidth>
              {savedFlash ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {t("saveEntry")}
            </Button>
          </div>
        )}
      </Card>

      {selectedLabour && (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            {t("weeklyMatrix")} — {selectedLabour.name}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("date")}</th>
                  <th className="py-2 pr-3">{t("workedToday")}</th>
                  <th className="py-2 pr-3">{t("site")}</th>
                  <th className="py-2 pr-3">{t("dailySalary")}</th>
                  <th className="py-2 pr-3">{t("extraAdvance")}</th>
                  <th className="py-2 pr-3">{t("totalCashPaid")}</th>
                  <th className="py-2 pr-3">{t("runningBalance")}</th>
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date, i) => {
                  const log = labourLogs.find((l) => l.date === date);
                  const isSelected = date === selectedDate;
                  const dayKey = WEEKDAY_KEYS[i] as TranslationKey;
                  return (
                    <tr
                      key={date}
                      className={`border-b border-slate-50 dark:border-slate-900 ${
                        isSelected ? "bg-orange-50/60 dark:bg-orange-950/20" : ""
                      }`}
                    >
                      <td className="py-2 pr-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {t(dayKey)}
                        </div>
                        <div className="text-xs text-slate-500">{date}</div>
                      </td>
                      <td className="py-2 pr-3">
                        {log ? (
                          log.workedToday ? (
                            <span className="text-emerald-600">✓</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )
                        ) : (
                          <span className="text-slate-300">{t("noEntryForDay")}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-slate-500">
                        {log
                          ? log.siteId
                            ? siteNameById.get(log.siteId) ?? "—"
                            : t("anySite")
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {log ? formatCurrency(log.dailySalary) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {log ? formatCurrency(log.extraAdvance) : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {log ? formatCurrency(log.totalCashPaid) : "—"}
                      </td>
                      <td
                        className={`py-2 pr-3 font-medium ${
                          balanceAsOf(date) >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(balanceAsOf(date))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
