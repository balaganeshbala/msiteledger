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
import type { SiteExpense } from "@/types";

export function useSiteExpenses(siteId: string | null) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<SiteExpense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !siteId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- drops the previous site's cached expenses when the scope changes
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "siteExpenses"),
      where("createdBy", "==", user.uid),
      where("siteId", "==", siteId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as SiteExpense)
      );
      rows.sort((a, b) => b.date.localeCompare(a.date));
      setExpenses(rows);
      setLoading(false);
    });
    return unsub;
  }, [user, siteId]);

  const addExpense = async (data: {
    date: string;
    title: string;
    amount: number;
  }) => {
    if (!user || !siteId) throw new Error("Missing context");
    await addDoc(collection(db, "siteExpenses"), {
      ...data,
      siteId,
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const updateExpense = async (
    id: string,
    data: { date: string; title: string; amount: number }
  ) => {
    await updateDoc(doc(db, "siteExpenses", id), data);
  };

  const removeExpense = async (id: string) => {
    await deleteDoc(doc(db, "siteExpenses", id));
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return { expenses, loading, addExpense, updateExpense, removeExpense, total };
}
