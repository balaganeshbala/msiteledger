import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  limit,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import type { Labour } from "@/types";

/** Thrown by removeLabour when the worker still has daily labour logs. */
export class LabourHasRecordsError extends Error {
  constructor() {
    super("Worker has recorded daily labour entries");
    this.name = "LabourHasRecordsError";
  }
}

export function useLabours() {
  const { user } = useAuth();
  const [labours, setLabours] = useState<Labour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous user's cached labours when auth scope changes
      setLabours([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "labours"),
      where("createdBy", "==", user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Labour));
      rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setLabours(rows);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addLabour = async (data: {
    name: string;
    phone: string;
    dailyRate: number;
  }) => {
    if (!user) throw new Error("Not authenticated");
    await addDoc(collection(db, "labours"), {
      ...data,
      isActive: true,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    trackEvent("labour_created");
  };

  const updateLabour = async (id: string, patch: Partial<Labour>) => {
    await updateDoc(doc(db, "labours", id), patch);
  };

  const removeLabour = async (id: string) => {
    if (!user) throw new Error("Not authenticated");

    const logsSnap = await getDocs(
      query(
        collection(db, "dailyLabourLogs"),
        where("createdBy", "==", user.uid),
        where("labourId", "==", id),
        limit(1)
      )
    );

    if (!logsSnap.empty) {
      throw new LabourHasRecordsError();
    }

    await deleteDoc(doc(db, "labours", id));
  };

  return { labours, loading, addLabour, updateLabour, removeLabour };
}
