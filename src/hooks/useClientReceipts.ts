"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { ClientReceipt } from "@/types";

export function useClientReceipts(siteId: string | null) {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<ClientReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !siteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous site's cached receipts when the scope changes
      setReceipts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "clientReceipts"),
      where("createdBy", "==", user.uid),
      where("siteId", "==", siteId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as ClientReceipt)
      );
      rows.sort((a, b) => b.date.localeCompare(a.date));
      setReceipts(rows);
      setLoading(false);
    });
    return unsub;
  }, [user, siteId]);

  const addReceipt = async (data: {
    date: string;
    description: string;
    amount: number;
  }) => {
    if (!user || !siteId) throw new Error("Missing context");
    await addDoc(collection(db, "clientReceipts"), {
      ...data,
      siteId,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const updateReceipt = async (
    id: string,
    data: { date: string; description: string; amount: number }
  ) => {
    await updateDoc(doc(db, "clientReceipts", id), data);
  };

  const removeReceipt = async (id: string) => {
    await deleteDoc(doc(db, "clientReceipts", id));
  };

  const total = receipts.reduce((sum, r) => sum + r.amount, 0);

  return { receipts, loading, addReceipt, updateReceipt, removeReceipt, total };
}
