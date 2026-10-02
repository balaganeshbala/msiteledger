import { useState } from "react";
import { useSearchParams } from "react-router";
import { Plus, Trash2, Pencil, Check, X, Wallet } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClientReceipts } from "@/hooks/useClientReceipts";
import { todayDateString } from "@/lib/labourCalculations";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function formatCurrency(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function SiteReceiptsPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const siteId = searchParams.get("id");
  const { receipts, addReceipt, updateReceipt, removeReceipt, total } =
    useClientReceipts(siteId);

  const [date, setDate] = useState(todayDateString());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!description.trim() || !amt || amt <= 0) return;
    setSaving(true);
    try {
      await addReceipt({ date, description: description.trim(), amount: amt });
      setDescription("");
      setAmount("");
      setIsAddOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => {
    setDate(todayDateString());
    setDescription("");
    setAmount("");
    setIsAddOpen(true);
  };

  const startEdit = (r: { id: string; date: string; description: string; amount: number }) => {
    setEditingId(r.id);
    setEditDate(r.date);
    setEditDescription(r.description);
    setEditAmount(String(r.amount));
  };

  const handleSaveEdit = async (id: string) => {
    const amt = Number(editAmount);
    if (!editDescription.trim() || !amt || amt <= 0) return;
    setSavingEdit(true);
    try {
      await updateReceipt(id, {
        date: editDate,
        description: editDescription.trim(),
        amount: amt,
      });
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      await removeReceipt(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">
            {t("totalReceipts")}
          </span>
          <div className="rounded-lg p-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold text-emerald-600">
          {formatCurrency(total)}
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("receiptList")}
          </h2>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            {t("addReceipt")}
          </Button>
        </div>

        {receipts.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t("noReceipts")}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {receipts.map((r) =>
              editingId === r.id ? (
                <li key={r.id} className="py-3">
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
                        label={t("receiptDescription")}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <Input
                      label={t("receiptAmount")}
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
                        onClick={() => handleSaveEdit(r.id)}
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
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {r.description}
                    </span>
                    <span className="text-xs text-slate-500">{r.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600">
                      {formatCurrency(r.amount)}
                    </span>
                    <button
                      onClick={() => startEdit(r)}
                      className="text-slate-400 hover:text-orange-600"
                      title={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(r.id)}
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

      <ConfirmDialog
        open={!!deleteTargetId}
        title={t("confirm")}
        message={t("confirmDeleteReceipt")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      <Modal
        open={isAddOpen}
        title={t("addReceipt")}
        onClose={() => setIsAddOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Input
            label={t("date")}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            label={t("receiptDescription")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("receiptHint")}
            autoFocus
            required
          />
          <Input
            label={t("receiptAmount")}
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Button type="submit" loading={saving} fullWidth>
            <Plus className="h-4 w-4" />
            {t("addReceipt")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
