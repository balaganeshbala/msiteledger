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
  deleteField,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import type { DailyLabourLog } from "@/types";
import { getWeekStartDate } from "@/lib/labourCalculations";

interface SaveEntryParams {
  labourId: string;
  date: string;
  /** Required for a worked day; ignored (and cleared) when worked is false. */
  siteId?: string;
  extraAdvance: number;
  /** Ignored (stored as 0) when worked is false. */
  dailySalary: number;
  worked: boolean;
  /** Informational head count; ignored when worked is false. */
  memberCount?: number;
  /**
   * Id of the entry being edited, when its date or worker was changed. That
   * entry is deleted in the same write, so the edit moves it rather than
   * leaving the old day behind.
   */
  movedFromId?: string;
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
    async ({
      labourId,
      date,
      siteId,
      extraAdvance,
      dailySalary,
      worked,
      memberCount,
      movedFromId,
    }: SaveEntryParams) => {
      if (!user) throw new Error("Not authenticated");

      const salary = worked ? dailySalary : 0;
      if (salary < 0 || extraAdvance < 0) {
        throw new Error("Amounts can't be negative");
      }
      if (worked && salary === 0) {
        throw new Error("Salary is required for a worked day");
      }
      if (worked && !siteId) {
        throw new Error("Site is required for a worked day");
      }
      const members = worked ? memberCount : undefined;
      if (members !== undefined && (!Number.isInteger(members) || members < 1)) {
        throw new Error("Members must be a whole number of at least 1");
      }
      if (!worked && extraAdvance === 0) {
        throw new Error("Enter an advance for a day not worked");
      }

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
      if (movedFromId && existing && existing.id !== movedFromId) {
        throw new Error("An entry already exists for this worker on that date");
      }

      // New entries get a deterministic `${labourId}_${date}` id so two devices
      // saving the same worker's same day write to one doc instead of creating
      // duplicates. Older entries keep their original random id.
      const ref = existing
        ? doc(db, "dailyLabourLogs", existing.id)
        : doc(db, "dailyLabourLogs", `${labourId}_${date}`);

      // createdAt is only stamped on a new entry; merge keeps the original
      // creation time when an existing day is edited.
      const data = {
        // An advance-only day isn't tied to any site; deleteField clears the
        // site when a worked day is switched to not worked.
        siteId: worked ? siteId : deleteField(),
        labourId,
        date,
        weekStartDate,
        dailySalary: salary,
        worked,
        // deleteField clears a count saved earlier when it's been removed.
        memberCount: members ?? deleteField(),
        extraAdvance,
        createdBy: user.uid,
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      };

      if (movedFromId && movedFromId !== ref.id) {
        const batch = writeBatch(db);
        batch.set(ref, data, { merge: true });
        batch.delete(doc(db, "dailyLabourLogs", movedFromId));
        await batch.commit();
      } else {
        await setDoc(ref, data, { merge: true });
      }
      trackEvent("labour_entry_saved", {
        is_new: !existing,
        is_move: Boolean(movedFromId),
        worked,
        has_advance: extraAdvance > 0,
      });
    },
    [user]
  );

  const deleteEntry = useCallback(
    async (logId: string) => {
      if (!user) throw new Error("Not authenticated");
      await deleteDoc(doc(db, "dailyLabourLogs", logId));
      trackEvent("labour_entry_deleted");
    },
    [user]
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
