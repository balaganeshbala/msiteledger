"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import { useLabours, LabourHasRecordsError } from "@/hooks/useLabours";
import { SiteHasRecordsError } from "@/hooks/useSites";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switch from "@/components/ui/Switch";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";

type ConfirmTarget = { type: "labour" | "site"; id: string };

export default function DirectoryPage() {
  const { t } = useLanguage();
  const { labours, addLabour, updateLabour, removeLabour } = useLabours();
  const { sites, addSite, updateSite, removeSite } = useSiteContext();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [savingLabour, setSavingLabour] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);

  const [siteName, setSiteName] = useState("");
  const [clientName, setClientName] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);

  const [editingLabourId, setEditingLabourId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRate, setEditRate] = useState("");
  const [savingLabourEdit, setSavingLabourEdit] = useState(false);

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editSiteName, setEditSiteName] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [savingSiteEdit, setSavingSiteEdit] = useState(false);

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [siteDeleteError, setSiteDeleteError] = useState<string | null>(null);
  const [labourDeleteError, setLabourDeleteError] = useState<string | null>(null);

  const handleAddLabour = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(dailyRate);
    if (!name.trim() || !rate || rate <= 0) return;
    setSavingLabour(true);
    try {
      await addLabour({ name: name.trim(), phone: phone.trim(), dailyRate: rate });
      setName("");
      setPhone("");
      setDailyRate("");
      setIsAddWorkerOpen(false);
    } finally {
      setSavingLabour(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    setSavingSite(true);
    try {
      await addSite(siteName.trim(), clientName.trim());
      setSiteName("");
      setClientName("");
      setIsAddSiteOpen(false);
    } finally {
      setSavingSite(false);
    }
  };

  const startEditLabour = (id: string, current: { name: string; phone: string; dailyRate: number }) => {
    setEditingLabourId(id);
    setEditName(current.name);
    setEditPhone(current.phone);
    setEditRate(String(current.dailyRate));
  };

  const handleSaveLabourEdit = async (id: string) => {
    const rate = Number(editRate);
    if (!editName.trim() || !rate || rate <= 0) return;
    setSavingLabourEdit(true);
    try {
      await updateLabour(id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        dailyRate: rate,
      });
      setEditingLabourId(null);
    } finally {
      setSavingLabourEdit(false);
    }
  };

  const startEditSite = (id: string, current: { siteName: string; clientName: string }) => {
    setEditingSiteId(id);
    setEditSiteName(current.siteName);
    setEditClientName(current.clientName);
  };

  const handleSaveSiteEdit = async (id: string) => {
    if (!editSiteName.trim()) return;
    setSavingSiteEdit(true);
    try {
      await updateSite(id, {
        siteName: editSiteName.trim(),
        clientName: editClientName.trim(),
      });
      setEditingSiteId(null);
    } finally {
      setSavingSiteEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleteLoading(true);
    try {
      if (confirmTarget.type === "labour") {
        await removeLabour(confirmTarget.id);
        setLabourDeleteError(null);
      } else {
        await removeSite(confirmTarget.id);
        setSiteDeleteError(null);
      }
      setConfirmTarget(null);
    } catch (err) {
      if (err instanceof SiteHasRecordsError) {
        setSiteDeleteError(t("siteHasRecordsError"));
        setConfirmTarget(null);
      } else if (err instanceof LabourHasRecordsError) {
        setLabourDeleteError(t("labourHasRecordsError"));
        setConfirmTarget(null);
      } else {
        throw err;
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        {t("directory")}
      </h1>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("labourWorkers")}
          </h2>
          <Button size="sm" onClick={() => setIsAddWorkerOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("addWorker")}
          </Button>
        </div>

        {labourDeleteError && (
          <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {labourDeleteError}
          </div>
        )}

        <div className="mt-4">
          {labours.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {t("noWorkersYet")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {labours.map((l) =>
                editingLabourId === l.id ? (
                  <li key={l.id} className="py-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                      <Input
                        label={t("workerName")}
                        placeholder={t("workerNameHint")}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        required
                      />
                      <Input
                        label={t("phone")}
                        placeholder={t("phoneHint")}
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                      <Input
                        label={t("rate")}
                        placeholder={t("rateHint")}
                        type="number"
                        min={0}
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        required
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={savingLabourEdit}
                          onClick={() => handleSaveLabourEdit(l.id)}
                          fullWidth
                        >
                          <Check className="h-4 w-4" />
                          {t("save")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingLabourId(null)}
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
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {l.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {l.phone ? `${l.phone} · ` : ""}₹{l.dailyRate}/day
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={l.isActive}
                        onChange={(v) => updateLabour(l.id, { isActive: v })}
                        label={l.isActive ? t("active") : t("inactive")}
                      />
                      <button
                        onClick={() => startEditLabour(l.id, l)}
                        className="text-slate-400 hover:text-orange-600"
                        title={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setLabourDeleteError(null);
                          setConfirmTarget({ type: "labour", id: l.id });
                        }}
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
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("constructionSites")}
          </h2>
          <Button size="sm" onClick={() => setIsAddSiteOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("addSite")}
          </Button>
        </div>

        {siteDeleteError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {siteDeleteError}
          </div>
        )}

        <div className="mt-4">
          {sites.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {t("noSitesInDirectory")}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
              {sites.map((s) =>
                editingSiteId === s.id ? (
                  <li key={s.id} className="py-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
                      <Input
                        label={t("siteName")}
                        placeholder={t("siteNameHint")}
                        value={editSiteName}
                        onChange={(e) => setEditSiteName(e.target.value)}
                        autoFocus
                        required
                      />
                      <Input
                        label={t("clientName")}
                        placeholder={t("clientNameHint")}
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          loading={savingSiteEdit}
                          onClick={() => handleSaveSiteEdit(s.id)}
                          fullWidth
                        >
                          <Check className="h-4 w-4" />
                          {t("save")}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingSiteId(null)}
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
                    key={s.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {s.siteName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {s.clientName || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEditSite(s.id, s)}
                        className="text-slate-400 hover:text-orange-600"
                        title={t("edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSiteDeleteError(null);
                          setConfirmTarget({ type: "site", id: s.id });
                        }}
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
        </div>
      </Card>

      <ConfirmDialog
        open={!!confirmTarget}
        title={t("confirm")}
        message={
          confirmTarget?.type === "site"
            ? t("confirmDeleteSite")
            : t("confirmDeleteWorker")
        }
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />

      <Modal
        open={isAddWorkerOpen}
        title={t("addWorker")}
        onClose={() => setIsAddWorkerOpen(false)}
      >
        <form onSubmit={handleAddLabour} className="flex flex-col gap-3">
          <Input
            label={t("workerName")}
            placeholder={t("workerNameHint")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            required
          />
          <Input
            label={t("phone")}
            placeholder={t("phoneHint")}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label={t("rate")}
            placeholder={t("rateHint")}
            type="number"
            min={0}
            value={dailyRate}
            onChange={(e) => setDailyRate(e.target.value)}
            required
          />
          <Button type="submit" loading={savingLabour} fullWidth>
            <Plus className="h-4 w-4" />
            {t("addWorker")}
          </Button>
        </form>
      </Modal>

      <Modal
        open={isAddSiteOpen}
        title={t("addSite")}
        onClose={() => setIsAddSiteOpen(false)}
      >
        <form onSubmit={handleAddSite} className="flex flex-col gap-3">
          <Input
            label={t("siteName")}
            placeholder={t("siteNameHint")}
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            autoFocus
            required
          />
          <Input
            label={t("clientName")}
            placeholder={t("clientNameHint")}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Button type="submit" loading={savingSite} fullWidth>
            <Plus className="h-4 w-4" />
            {t("addSite")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
