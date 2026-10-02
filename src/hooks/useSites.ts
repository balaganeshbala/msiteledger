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
import type { Site } from "@/types";

/** Thrown by removeSite when the site still has expenses, receipts, or labour charges. */
export class SiteHasRecordsError extends Error {
  constructor() {
    super("Site has recorded expenses, receipts, or labour charges");
    this.name = "SiteHasRecordsError";
  }
}

export function useSites() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous user's cached sites when auth scope changes
      setSites([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, "sites"), where("createdBy", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Site));
      rows.sort((a, b) => (a.siteName || "").localeCompare(b.siteName || ""));
      setSites(rows);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const addSite = async (siteName: string, clientName: string) => {
    if (!user) throw new Error("Not authenticated");
    await addDoc(collection(db, "sites"), {
      siteName,
      clientName,
      isCompleted: false,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
    trackEvent("site_created");
  };

  const updateSite = async (id: string, patch: Partial<Site>) => {
    await updateDoc(doc(db, "sites", id), patch);
  };

  const removeSite = async (id: string) => {
    if (!user) throw new Error("Not authenticated");

    const [expensesSnap, receiptsSnap, logsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, "siteExpenses"),
          where("createdBy", "==", user.uid),
          where("siteId", "==", id),
          limit(1)
        )
      ),
      getDocs(
        query(
          collection(db, "clientReceipts"),
          where("createdBy", "==", user.uid),
          where("siteId", "==", id),
          limit(1)
        )
      ),
      getDocs(
        query(
          collection(db, "dailyLabourLogs"),
          where("createdBy", "==", user.uid),
          where("siteId", "==", id),
          limit(1)
        )
      ),
    ]);

    if (!expensesSnap.empty || !receiptsSnap.empty || !logsSnap.empty) {
      throw new SiteHasRecordsError();
    }

    await deleteDoc(doc(db, "sites", id));
  };

  return { sites, loading, addSite, updateSite, removeSite };
}
