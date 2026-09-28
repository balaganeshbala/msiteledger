"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { DailyLabourLog } from "@/types";

/** Every worker's logs for a single week (Sun weekStartDate), across all sites. */
export function useWeeklyLabourLogs(weekStartDate: string) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLabourLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous user's cached logs when auth scope changes
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "dailyLabourLogs"),
      where("createdBy", "==", user.uid),
      where("weekStartDate", "==", weekStartDate)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as DailyLabourLog)
      );
      setLogs(rows);
      setLoading(false);
    });
    return unsub;
  }, [user, weekStartDate]);

  return { logs, loading };
}
