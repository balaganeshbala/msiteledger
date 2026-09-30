import { Link } from "react-router";
import { Building2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";

export default function SitesPage() {
  const { t } = useLanguage();
  const { sites, loading } = useSiteContext();

  if (loading) {
    return <p className="text-sm text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        {t("sites")}
      </h1>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Building2 className="h-8 w-8 text-slate-400" />
          <p className="max-w-xs text-sm text-slate-500">
            {t("selectSitePrompt")}
          </p>
          <Link
            to="/directory"
            className="text-sm font-medium text-orange-600 underline"
          >
            {t("createFirstSite")}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                to={`/site?id=${site.id}`}
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
