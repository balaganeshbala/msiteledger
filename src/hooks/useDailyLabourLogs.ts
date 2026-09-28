"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyLabourLog } from "@/types";

/**
 * Read-only, site-scoped view of labour logs (used for a site's totals and
 * activity feed) — see useLabourLedger for saving entries.
 *
 * A site's labour cost is always the full earned salary (dailySalary), never
 * net of advances: extraAdvance is a personal loan against the worker's
 * weekly payout, settled on Saturday, and never shrinks or inflates what a
 * site is charged for a day's work.
 */
export function useDailyLabourLogs(siteId: string | null) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLabourLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !siteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous site's cached logs when the scope changes
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "dailyLabourLogs"),
      where("createdBy", "==", user.uid),
      where("siteId", "==", siteId)
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
  }, [user, siteId]);

  const totalLabourOutflow = logs.reduce((sum, l) => sum + l.dailySalary, 0);

  return { logs, loading, totalLabourOutflow };
}
