"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyLabourLog } from "@/types";
import { getWeekStartDate, maxAdvanceToday } from "@/lib/labourCalculations";

interface SaveEntryParams {
  labourId: string;
  date: string;
  siteId: string;
  extraAdvance: number;
  dailyRate: number;
}

/**
 * A worker's full log history. Each week is self-contained: salary is
 * earned per worked day but handed over as one lump sum on Saturday, and
 * any advance taken during the week is deducted from that same week's
 * payout. Nothing carries over between weeks, so saving one day's entry
 * never touches another day's stored values.
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
    async ({ labourId, date, siteId, extraAdvance, dailyRate }: SaveEntryParams) => {
      if (!user) throw new Error("Not authenticated");

      const weekStartDate = getWeekStartDate(date);
      const weekQuery = query(
        collection(db, "dailyLabourLogs"),
        where("createdBy", "==", user.uid),
        where("labourId", "==", labourId),
        where("weekStartDate", "==", weekStartDate)
      );
      const weekSnap = await getDocs(weekQuery);
      const weekDocs = weekSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DailyLabourLog, "id">),
      }));

      const existing = weekDocs.find((d) => d.date === date);
      const otherWeekLogs = weekDocs.filter((d) => d.date !== date);

      const available = maxAdvanceToday(otherWeekLogs, dailyRate);
      if (extraAdvance > available) {
        throw new Error(
          `Advance exceeds this week's remaining salary (max ₹${available})`
        );
      }

      // New entries get a deterministic `${labourId}_${date}` id so two devices
      // saving the same worker's same day write to one doc instead of creating
      // duplicates. Older entries keep their original random id.
      const ref = existing
        ? doc(db, "dailyLabourLogs", existing.id)
        : doc(db, "dailyLabourLogs", `${labourId}_${date}`);

      await setDoc(ref, {
        siteId,
        labourId,
        date,
        weekStartDate,
        dailySalary: dailyRate,
        extraAdvance,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
    },
    [user]
  );

  const deleteEntry = useCallback(
    async (date: string) => {
      if (!user) throw new Error("Not authenticated");
      const existing = logs.find((l) => l.date === date);
      if (!existing) return;
      await deleteDoc(doc(db, "dailyLabourLogs", existing.id));
    },
    [user, logs]
  );

  const getWeeklyLogs = useCallback(
    (weekStartDate: string) =>
      logs.filter((l) => l.weekStartDate === weekStartDate),
    [logs]
  );

  return {
    logs,
    loading,
    saveEntry,
    deleteEntry,
    getWeeklyLogs,
  };
}
