"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Save, Check, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import { useLabours } from "@/hooks/useLabours";
import { useLabourLedger } from "@/hooks/useLabourLedger";
import { useWeeklyLabourLogs } from "@/hooks/useWeeklyLabourLogs";
import {
  getWeekStartDate,
  getWeekDates,
  computeWeekTotals,
  maxAdvanceToday,
  todayDateString,
  WEEKDAY_KEYS,
} from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
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
  const [extraAdvance, setExtraAdvance] = useState("0");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { logs: labourLogs, saveEntry, deleteEntry } = useLabourLedger(selectedLabourId);

  const selectedLabour = labours.find((l) => l.id === selectedLabourId) ?? null;

  useEffect(() => {
    if (!selectedLabourId) return;
    const existing = labourLogs.find((l) => l.date === selectedDate);
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form once Firestore confirms an entry exists for this day
      setExtraAdvance(String(existing.extraAdvance));
      setSelectedSiteId(existing.siteId);
    } else {
      setExtraAdvance("0");
    }
  }, [selectedLabourId, selectedDate, labourLogs]);

  const weekStartDate = getWeekStartDate(selectedDate);

  const otherWeekLogs = labourLogs.filter(
    (l) => l.weekStartDate === weekStartDate && l.date !== selectedDate
  );

  const advanceValue = Number(extraAdvance) || 0;
  const todaysSalary = selectedLabour?.dailyRate ?? 0;
  const maxAdvance = maxAdvanceToday(otherWeekLogs, todaysSalary);
  const advanceExceeds = advanceValue > maxAdvance;

  const weekPreviewTotals = computeWeekTotals([
    ...otherWeekLogs,
    { dailySalary: todaysSalary, extraAdvance: advanceValue },
  ]);

  const canSave = Boolean(selectedSiteId) && !advanceExceeds;

  const existingEntry = selectedLabourId
    ? labourLogs.find((l) => l.date === selectedDate) ?? null
    : null;

  const [tableWeekAnchorDate, setTableWeekAnchorDate] = useState(
    todayDateString()
  );
  const tableWeekStartDate = getWeekStartDate(tableWeekAnchorDate);
  const tableWeekDates = getWeekDates(tableWeekStartDate);

  const { logs: weekLogs } = useWeeklyLabourLogs(tableWeekStartDate);

  const labourNameById = useMemo(() => {
    const map = new Map<string, string>();
    labours.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [labours]);

  const weeklyWorkerRows = useMemo(() => {
    const byLabour = new Map<string, typeof weekLogs>();
    for (const log of weekLogs) {
      byLabour.set(log.labourId, [...(byLabour.get(log.labourId) ?? []), log]);
    }
    return Array.from(byLabour.entries())
      .map(([labourId, logs]) => ({
        labourId,
        logs,
        totals: computeWeekTotals(logs),
      }))
      .sort((a, b) =>
        (labourNameById.get(a.labourId) ?? "").localeCompare(
          labourNameById.get(b.labourId) ?? ""
        )
      );
  }, [weekLogs, labourNameById]);

  const handleSave = async () => {
    if (!selectedLabourId || !selectedLabour || !selectedSiteId || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveEntry({
        labourId: selectedLabourId,
        date: selectedDate,
        siteId: selectedSiteId,
        extraAdvance: advanceValue,
        dailyRate: selectedLabour.dailyRate,
      });
      setSavedFlash(true);
      setTimeout(() => {
        setSavedFlash(false);
        setIsModalOpen(false);
      }, 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedLabourId) return;
    setDeleting(true);
    try {
      await deleteEntry(selectedDate);
      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const openNewEntry = () => {
    setSelectedDate(todayDateString());
    setSelectedLabourId(null);
    setExtraAdvance("0");
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditEntry = (labourId: string, date: string) => {
    setSelectedLabourId(labourId);
    setSelectedDate(date);
    setSaveError(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("dailyLabourEntry")}
        </h1>
        <Button onClick={openNewEntry} size="sm">
          <Plus className="h-4 w-4" />
          {t("addEntry")}
        </Button>
      </div>

      <Modal
        open={isModalOpen}
        title={t("dailyLabourEntry")}
        onClose={() => setIsModalOpen(false)}
      >
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
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("extraAdvance")}
              </label>
              <input
                type="number"
                min={0}
                max={maxAdvance}
                value={extraAdvance}
                onChange={(e) => setExtraAdvance(e.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
                  advanceExceeds
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 focus:border-orange-500 focus:ring-orange-500/20 dark:border-slate-700"
                }`}
              />
              <p
                className={`text-xs ${
                  advanceExceeds
                    ? "text-red-600"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {advanceExceeds
                  ? t("advanceExceedsAvailable")
                  : `${t("advanceAvailable")}: ${formatCurrency(maxAdvance)}`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
              <div>
                <p className="text-xs text-slate-500">{t("totalSalaryThisWeek")}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {formatCurrency(weekPreviewTotals.totalSalary)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("totalAdvanceThisWeek")}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {formatCurrency(weekPreviewTotals.totalAdvance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("netPayableSaturday")}</p>
                <p className="text-sm font-semibold text-emerald-600">
                  {formatCurrency(weekPreviewTotals.netPayable)}
                </p>
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} loading={saving} disabled={!canSave} fullWidth>
                {savedFlash ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {t("saveEntry")}
              </Button>
              {existingEntry && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  title={t("delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("confirm")}
        message={t("confirmDeleteEntry")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        loading={deleting}
        onConfirm={handleDeleteEntry}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

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
              value={tableWeekAnchorDate}
              onChange={(e) => setTableWeekAnchorDate(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
        {weeklyWorkerRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noActivity")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("workerName")}</th>
                  {tableWeekDates.map((date, i) => (
                    <th key={date} className="py-2 pr-3">
                      <div>{t(WEEKDAY_KEYS[i] as TranslationKey)}</div>
                      <div className="font-normal text-slate-400">{date}</div>
                    </th>
                  ))}
                  <th className="py-2 pr-3">{t("totalSalaryThisWeek")}</th>
                  <th className="py-2 pr-3">{t("totalAdvanceThisWeek")}</th>
                  <th className="py-2 pr-3">{t("netPayableSaturday")}</th>
                </tr>
              </thead>
              <tbody>
                {weeklyWorkerRows.map(({ labourId, logs, totals }) => (
                  <tr
                    key={labourId}
                    className="border-b border-slate-50 dark:border-slate-900"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-100">
                      {labourNameById.get(labourId) ?? "Worker"}
                    </td>
                    {tableWeekDates.map((date) => {
                      const log = logs.find((l) => l.date === date);
                      return (
                        <td key={date} className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => openEditEntry(labourId, date)}
                            className="-m-1 flex w-full flex-col rounded-md p-1 text-left hover:bg-orange-50 dark:hover:bg-orange-950/20"
                          >
                            {log ? (
                              <>
                                <span>{formatCurrency(log.dailySalary)}</span>
                                {log.extraAdvance > 0 && (
                                  <span className="text-xs text-red-600">
                                    -{formatCurrency(log.extraAdvance)}
                                  </span>
                                )}
                                <span className="text-xs text-slate-400">
                                  {siteNameById.get(log.siteId) ?? "—"}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 font-semibold">
                      {formatCurrency(totals.totalSalary)}
                    </td>
                    <td className="py-2 pr-3 font-semibold">
                      {formatCurrency(totals.totalAdvance)}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-emerald-600">
                      {formatCurrency(totals.netPayable)}
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
