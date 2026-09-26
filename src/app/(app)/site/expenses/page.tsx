"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteExpenses } from "@/hooks/useSiteExpenses";
import { todayDateString } from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

function SiteExpensesContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const siteId = searchParams.get("id");
  const { expenses, addExpense, updateExpense, removeExpense, total } =
    useSiteExpenses(siteId);

  const [date, setDate] = useState(todayDateString());
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!title.trim() || !amt || amt <= 0) return;
    setSaving(true);
    try {
      await addExpense({ date, title: title.trim(), amount: amt });
      setTitle("");
      setAmount("");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (exp: { id: string; date: string; title: string; amount: number }) => {
    setEditingId(exp.id);
    setEditDate(exp.date);
    setEditTitle(exp.title);
    setEditAmount(String(exp.amount));
  };

  const handleSaveEdit = async (id: string) => {
    const amt = Number(editAmount);
    if (!editTitle.trim() || !amt || amt <= 0) return;
    setSavingEdit(true);
    try {
      await updateExpense(id, { date: editDate, title: editTitle.trim(), amount: amt });
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
        >
          <Input
            label={t("date")}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label={t("expenseTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("expenseHint")}
              required
            />
          </div>
          <Input
            label={t("expenseAmount")}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <div className="sm:col-span-4">
            <Button type="submit" loading={saving} fullWidth>
              <Plus className="h-4 w-4" />
              {t("addExpense")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("expenseList")}
          </h2>
          <span className="text-sm font-bold text-red-600">
            {formatCurrency(total)}
          </span>
        </div>

        {expenses.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noExpenses")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((exp) =>
              editingId === exp.id ? (
                <li key={exp.id} className="py-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                    <Input
                      label={t("date")}
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      required
                    />
                    <div className="sm:col-span-2">
                      <Input
                        label={t("expenseTitle")}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <Input
                      label={t("expenseAmount")}
                      type="number"
                      min={0}
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 sm:col-span-4">
                      <Button
                        type="button"
                        size="sm"
                        loading={savingEdit}
                        onClick={() => handleSaveEdit(exp.id)}
                        fullWidth
                      >
                        <Check className="h-4 w-4" />
                        {t("save")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingId(null)}
                        fullWidth
                      >
                        <X className="h-4 w-4" />
                        {t("cancel")}
                      </Button>
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={exp.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {exp.title}
                    </span>
                    <span className="text-xs text-slate-500">{exp.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(exp.amount)}
                    </span>
                    <button
                      onClick={() => startEdit(exp)}
                      className="text-slate-400 hover:text-orange-600"
                      title={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeExpense(exp.id)}
                      className="text-slate-400 hover:text-red-600"
                      title={t("delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function SiteExpensesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
      <SiteExpensesContent />
    </Suspense>
  );
}
