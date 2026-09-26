"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyLabourLog } from "@/types";
import {
  getWeekStartDate,
  computeEntry,
  isZeroActivity,
} from "@/lib/labourCalculations";

interface SaveEntryParams {
  labourId: string;
  date: string;
  workedToday: boolean;
  /** The site worked at, or null on a non-work day (advance not tied to any site). */
  siteId: string | null;
  extraAdvance: number;
  dailyRate: number;
}

/**
 * A worker's full ledger across every site, in date order. The running
 * balance is a single global figure per worker: salary earned at any site
 * pays down the same advance debt, and advances given on a non-work day
 * (no site attached) draw against it too.
 */
export function useLabourLedger(labourId: string | null) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLabourLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !labourId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous worker's cached ledger when the scope changes
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "dailyLabourLogs"),
      where("createdBy", "==", user.uid),
      where("labourId", "==", labourId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DailyLabourLog)
      );
      rows.sort((a, b) => a.date.localeCompare(b.date));
      setLogs(rows);
      setLoading(false);
    });
    return unsub;
  }, [user, labourId]);

  const saveEntry = useCallback(
    async ({ labourId, date, workedToday, siteId, extraAdvance, dailyRate }: SaveEntryParams) => {
      if (!user) throw new Error("Not authenticated");

      const q = query(
        collection(db, "dailyLabourLogs"),
        where("createdBy", "==", user.uid),
        where("labourId", "==", labourId)
      );
      const snap = await getDocs(q);
      const existing = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DailyLabourLog, "id">),
      }));

      const others = existing.filter((e) => e.date !== date);
      const zeroActivity = isZeroActivity(workedToday, extraAdvance);

      type WorkingEntry = Pick<
        DailyLabourLog,
        "id" | "date" | "workedToday" | "extraAdvance"
      > & { siteId: string | null };

      const working: WorkingEntry[] = others.map((e) => ({
        id: e.id,
        date: e.date,
        workedToday: e.workedToday,
        extraAdvance: e.extraAdvance,
        siteId: e.siteId ?? null,
      }));

      if (!zeroActivity) {
        const currentExisting = existing.find((e) => e.date === date);
        working.push({
          id: currentExisting?.id ?? "",
          date,
          workedToday,
          extraAdvance: extraAdvance || 0,
          siteId: workedToday ? siteId : null,
        });
      }

      working.sort((a, b) => a.date.localeCompare(b.date));

      const batch = writeBatch(db);
      let previousBalance = 0;

      for (const entry of working) {
        const { dailySalary, totalCashPaid, runningBalance } = computeEntry(
          entry.workedToday,
          dailyRate,
          entry.extraAdvance,
          previousBalance
        );
        previousBalance = runningBalance;

        const ref = entry.id
          ? doc(db, "dailyLabourLogs", entry.id)
          : doc(collection(db, "dailyLabourLogs"));

        batch.set(ref, {
          siteId: entry.siteId,
          labourId,
          date: entry.date,
          weekStartDate: getWeekStartDate(entry.date),
          workedToday: entry.workedToday,
          dailySalary,
          extraAdvance: entry.extraAdvance,
          totalCashPaid,
          runningBalance,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
      }

      if (zeroActivity) {
        const toDelete = existing.find((e) => e.date === date);
        if (toDelete) {
          batch.delete(doc(db, "dailyLabourLogs", toDelete.id));
        }
      }

      await batch.commit();
    },
    [user]
  );

  const getWeeklyLogs = useCallback(
    (weekStartDate: string) =>
      logs.filter((l) => l.weekStartDate === weekStartDate),
    [logs]
  );

  const currentBalance = logs.length ? logs[logs.length - 1].runningBalance : 0;

  return {
    logs,
    loading,
    saveEntry,
    getWeeklyLogs,
    currentBalance,
  };
}
