"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function SitesPage() {
  const { t } = useLanguage();
  const { sites, loading, addSite } = useSiteContext();

  const [creating, setCreating] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [clientName, setClientName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;
    setSaving(true);
    try {
      await addSite(siteName.trim(), clientName.trim());
      setSiteName("");
      setClientName("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          {t("sites")}
        </h1>
        {sites.length > 0 && !creating && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            {t("addSite")}
          </Button>
        )}
      </div>

      {creating && (
        <Card>
          <form
            onSubmit={handleCreateSite}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end"
          >
            <Input
              label={t("siteName")}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              autoFocus
              required
            />
            <Input
              label={t("clientName")}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button type="submit" loading={saving} fullWidth>
                {t("save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setCreating(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {sites.length === 0 && !creating ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Building2 className="h-8 w-8 text-slate-400" />
          <p className="max-w-xs text-sm text-slate-500">
            {t("selectSitePrompt")}
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            {t("createFirstSite")}
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={`/site?id=${site.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-800"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {site.siteName}
                    </p>
                    {site.clientName && (
                      <p className="text-xs text-slate-500">
                        {site.clientName}
                      </p>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
