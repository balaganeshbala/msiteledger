import { useState, useEffect, useMemo } from "react";
import { Plus, Save, Check, Trash2, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import { useLabours } from "@/hooks/useLabours";
import { useLabourLedger } from "@/hooks/useLabourLedger";
import { useWeeklyLabourLogs } from "@/hooks/useWeeklyLabourLogs";
import {
  getWeekStartDate,
  getWeekDates,
  computeWeekTotals,
  isWorkedDay,
  todayDateString,
  WEEKDAY_KEYS,
} from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Switch from "@/components/ui/Switch";
import LabourAutocomplete from "@/components/LabourAutocomplete";
import type { TranslationKey } from "@/lib/translations";
import type { DailyLabourLog, Site } from "@/types";

/** First active site, falling back to any site if every one is completed. */
function defaultSiteId(sites: Site[]): string | null {
  return (sites.find((s) => !s.isCompleted) ?? sites[0])?.id ?? null;
}

function formatCurrency(n: number) {
  return `${n < 0 ? "-" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;
}

/** Net payable goes red when advances are more than the salary earned. */
function netPayableClass(n: number) {
  return n < 0 ? "text-red-600" : "text-emerald-600";
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
      setSelectedSiteId(defaultSiteId(sites));
    }
  }, [sites, sitesLoading, selectedSiteId]);

  // Completed sites aren't offered for new entries, but an entry already on
  // one keeps it selectable so it can still be edited.
  const pickableSites = sites.filter(
    (s) => !s.isCompleted || s.id === selectedSiteId
  );

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
  const [worked, setWorked] = useState(true);
  const [salary, setSalary] = useState("0");
  const [members, setMembers] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // The entry opened from the table for editing. If its date or worker is
  // changed in the form, saving moves this entry instead of adding a new one.
  const [editingLog, setEditingLog] = useState<DailyLabourLog | null>(null);

  const { logs: labourLogs, saveEntry, deleteEntry } = useLabourLedger(selectedLabourId);

  const selectedLabour = labours.find((l) => l.id === selectedLabourId) ?? null;
  const selectedDailyRate = selectedLabour?.dailyRate ?? 0;

  const isMoving =
    editingLog !== null &&
    (editingLog.labourId !== selectedLabourId || editingLog.date !== selectedDate);

  useEffect(() => {
    if (!selectedLabourId) return;
    // Moving an entry keeps the values being edited rather than reloading
    // whatever is (or isn't) saved on the new day.
    if (isMoving) return;
    const existing =
      editingLog ??
      labourLogs.find(
        (l) => l.labourId === selectedLabourId && l.date === selectedDate
      );
    if (existing) {
      const existingWorked = isWorkedDay(existing);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form once Firestore confirms an entry exists for this day
      setExtraAdvance(String(existing.extraAdvance));
      setWorked(existingWorked);
      setSalary(String(existingWorked ? existing.dailySalary : selectedDailyRate));
      setMembers(existing.memberCount ? String(existing.memberCount) : "");
      if (existing.siteId) setSelectedSiteId(existing.siteId);
    } else {
      setExtraAdvance("0");
      setWorked(true);
      setSalary(String(selectedDailyRate));
      setMembers("");
    }
  }, [selectedLabourId, selectedDate, labourLogs, selectedDailyRate, isMoving, editingLog]);

  const weekStartDate = getWeekStartDate(selectedDate);

  const otherWeekLogs = labourLogs.filter(
    (l) =>
      l.labourId === selectedLabourId &&
      l.weekStartDate === weekStartDate &&
      l.date !== selectedDate &&
      l.id !== editingLog?.id
  );

  const advanceValue = Number(extraAdvance) || 0;
  const salaryValue = Number(salary) || 0;
  const todaysSalary = worked ? salaryValue : 0;
  const salaryMissing = worked && salaryValue <= 0;
  const advanceMissing = !worked && advanceValue <= 0;
  const memberCount = members.trim() === "" ? undefined : Number(members);
  const membersInvalid =
    worked &&
    memberCount !== undefined &&
    (!Number.isInteger(memberCount) || memberCount < 1);

  const weekPreviewTotals = computeWeekTotals([
    ...otherWeekLogs,
    { dailySalary: todaysSalary, extraAdvance: advanceValue },
  ]);

  const entryOnSelectedDate = selectedLabourId
    ? labourLogs.find(
        (l) => l.labourId === selectedLabourId && l.date === selectedDate
      ) ?? null
    : null;
  const moveConflict = isMoving && entryOnSelectedDate !== null;
  // The trash icon always deletes the entry that was opened, even mid-move.
  const existingEntry = editingLog ?? entryOnSelectedDate;

  const canSave =
    (!worked || Boolean(selectedSiteId)) &&
    !moveConflict &&
    !salaryMissing &&
    !advanceMissing &&
    !membersInvalid &&
    advanceValue >= 0;

  const [tableWeekAnchorDate, setTableWeekAnchorDate] = useState(
    todayDateString()
  );
  const tableWeekStartDate = getWeekStartDate(tableWeekAnchorDate);
  const [onlyWithEntries, setOnlyWithEntries] = useState(false);
  const tableWeekDates = getWeekDates(tableWeekStartDate);

  const { logs: weekLogs } = useWeeklyLabourLogs(tableWeekStartDate);

  const labourNameById = useMemo(() => {
    const map = new Map<string, string>();
    labours.forEach((l) => map.set(l.id, l.name));
    return map;
  }, [labours]);

  // Every active worker gets a row (even with no entries yet this week), plus
  // any inactive worker who still has entries in this week.
  const weeklyWorkerRows = useMemo(() => {
    const byLabour = new Map<string, typeof weekLogs>();
    labours
      .filter((l) => l.isActive)
      .forEach((l) => byLabour.set(l.id, []));
    for (const log of weekLogs) {
      byLabour.set(log.labourId, [...(byLabour.get(log.labourId) ?? []), log]);
    }
    return Array.from(byLabour.entries())
      .map(([labourId, logs]) => ({
        labourId,
        logs,
        totals: computeWeekTotals(logs),
        workedDays: logs.filter(isWorkedDay).length,
      }))
      .sort((a, b) =>
        (labourNameById.get(a.labourId) ?? "").localeCompare(
          labourNameById.get(b.labourId) ?? ""
        )
      );
  }, [weekLogs, labours, labourNameById]);

  const weekGrandTotals = useMemo(() => computeWeekTotals(weekLogs), [weekLogs]);

  // Filters on "has any entry this week" rather than workedDays > 0 so a row
  // carrying an advance is never hidden while the footer still counts it.
  const visibleWorkerRows = onlyWithEntries
    ? weeklyWorkerRows.filter((row) => row.logs.length > 0)
    : weeklyWorkerRows;

  const handleSave = async () => {
    if (!selectedLabourId || !selectedLabour || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveEntry({
        labourId: selectedLabourId,
        date: selectedDate,
        siteId: worked ? selectedSiteId ?? undefined : undefined,
        extraAdvance: advanceValue,
        dailySalary: salaryValue,
        worked,
        memberCount: worked ? memberCount : undefined,
        movedFromId: isMoving ? editingLog?.id : undefined,
      });
      // The saved entry now lives on the selected day; stop treating the
      // form as a pending move.
      setEditingLog(null);
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
    if (!existingEntry) return;
    setDeleting(true);
    try {
      await deleteEntry(existingEntry.id);
      setIsDeleteConfirmOpen(false);
      setIsModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const openNewEntry = () => {
    setSelectedDate(todayDateString());
    setSelectedLabourId(null);
    setEditingLog(null);
    if (sites.find((s) => s.id === selectedSiteId)?.isCompleted) {
      setSelectedSiteId(defaultSiteId(sites));
    }
    setExtraAdvance("0");
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditEntry = (labourId: string, date: string) => {
    setEditingLog(
      weekLogs.find((l) => l.labourId === labourId && l.date === date) ?? null
    );
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

          {worked && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("site")}
              </label>
              <select
                value={selectedSiteId ?? ""}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {pickableSites.length === 0 && <option value="">—</option>}
                {pickableSites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteName}
                    {site.clientName ? ` — ${site.clientName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <Switch
                checked={worked}
                onChange={setWorked}
                label={t("workedThisDay")}
              />
              {!worked && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("advanceOnlyHint")}
                </p>
              )}
            </div>

            {worked && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("salaryForDay")}
                </label>
                <input
                  type="number"
                  min={0}
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
                    salaryMissing
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-orange-500 focus:ring-orange-500/20 dark:border-slate-700"
                  }`}
                />
                <p
                  className={`text-xs ${
                    salaryMissing ? "text-red-600" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {salaryMissing
                    ? t("salaryRequired")
                    : `${t("dailySalary")}: ${formatCurrency(selectedDailyRate)}`}
                </p>
              </div>
            )}

            {worked && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("membersWorked")}
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  placeholder={t("optional")}
                  value={members}
                  onChange={(e) => setMembers(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
                    membersInvalid
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                      : "border-slate-300 focus:border-orange-500 focus:ring-orange-500/20 dark:border-slate-700"
                  }`}
                />
                <p
                  className={`text-xs ${
                    membersInvalid ? "text-red-600" : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {membersInvalid ? t("membersInvalid") : t("membersHint")}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t("extraAdvance")}
              </label>
              <input
                type="number"
                min={0}
                value={extraAdvance}
                onChange={(e) => setExtraAdvance(e.target.value)}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 dark:bg-slate-900 dark:text-slate-100 ${
                  advanceMissing
                    ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                    : "border-slate-300 focus:border-orange-500 focus:ring-orange-500/20 dark:border-slate-700"
                }`}
              />
              {advanceMissing ? (
                <p className="text-xs text-red-600">{t("advanceRequired")}</p>
              ) : (
                weekPreviewTotals.netPayable < 0 && (
                  <p className="text-xs text-amber-600">
                    {t("advanceMoreThanSalary")}
                  </p>
                )
              )}
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
                <p
                  className={`text-sm font-semibold ${netPayableClass(
                    weekPreviewTotals.netPayable
                  )}`}
                >
                  {formatCurrency(weekPreviewTotals.netPayable)}
                </p>
              </div>
            </div>

            {isMoving && editingLog && (
              <p
                className={`text-xs ${
                  moveConflict ? "text-red-600" : "text-amber-600"
                }`}
              >
                {moveConflict
                  ? t("entryExistsOnDate")
                  : `${t("entryWillMove")} ${editingLog.date}`}
              </p>
            )}

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
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              checked={onlyWithEntries}
              onChange={setOnlyWithEntries}
              label={t("onlyWorkedThisWeek")}
            />
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
        </div>
        {visibleWorkerRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {onlyWithEntries ? t("noOneWorkedThisWeek") : t("noActivity")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3">{t("workerName")}</th>
                  {tableWeekDates.map((date, i) => (
                    <th key={date} className="min-w-[90px] py-2 pr-3">
                      <div>{t(WEEKDAY_KEYS[i] as TranslationKey)}</div>
                      <div className="font-normal text-slate-400">{date}</div>
                    </th>
                  ))}
                  <th className="py-2 pr-3">{t("workedDays")}</th>
                  <th className="py-2 pr-3">{t("totalSalaryThisWeek")}</th>
                  <th className="py-2 pr-3">{t("totalAdvanceThisWeek")}</th>
                  <th className="py-2 pr-3">{t("netPayableSaturday")}</th>
                </tr>
              </thead>
              <tbody>
                {visibleWorkerRows.map(({ labourId, logs, totals, workedDays }) => (
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
                        <td key={date} className="min-w-[90px] py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => openEditEntry(labourId, date)}
                            className="-m-1 flex w-full flex-col rounded-md p-1 text-left hover:bg-orange-50 dark:hover:bg-orange-950/20"
                          >
                            {log ? (
                              <>
                                {isWorkedDay(log) ? (
                                  <span className="flex items-center gap-1.5">
                                    {formatCurrency(log.dailySalary)}
                                    {log.memberCount ? (
                                      <span
                                        className="inline-flex items-center gap-0.5 text-xs text-slate-500"
                                        title={t("membersWorked")}
                                      >
                                        <Users className="h-3 w-3" />
                                        {log.memberCount}
                                      </span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-500">
                                    {t("notWorked")}
                                  </span>
                                )}
                                {log.extraAdvance > 0 && (
                                  <span className="text-xs text-red-600">
                                    -{formatCurrency(log.extraAdvance)}
                                  </span>
                                )}
                                {isWorkedDay(log) && (
                                  <span className="text-xs text-slate-400">
                                    {(log.siteId && siteNameById.get(log.siteId)) ?? "—"}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2 pr-3 font-semibold">{workedDays}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {formatCurrency(totals.totalSalary)}
                    </td>
                    <td className="py-2 pr-3 font-semibold">
                      {formatCurrency(totals.totalAdvance)}
                    </td>
                    <td
                      className={`py-2 pr-3 font-semibold ${netPayableClass(
                        totals.netPayable
                      )}`}
                    >
                      {formatCurrency(totals.netPayable)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700">
                  <td
                    colSpan={tableWeekDates.length + 2}
                    className="py-2 pr-3 font-semibold text-slate-800 dark:text-slate-100"
                  >
                    {t("weekTotal")}
                  </td>
                  <td className="py-2 pr-3 font-bold">
                    {formatCurrency(weekGrandTotals.totalSalary)}
                  </td>
                  <td className="py-2 pr-3 font-bold">
                    {formatCurrency(weekGrandTotals.totalAdvance)}
                  </td>
                  <td
                    className={`py-2 pr-3 font-bold ${netPayableClass(
                      weekGrandTotals.netPayable
                    )}`}
                  >
                    {formatCurrency(weekGrandTotals.netPayable)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
