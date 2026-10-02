import { Link } from "react-router";
import { Building2, CheckCircle2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSiteContext } from "@/contexts/SiteContext";
import type { Site } from "@/types";

function SiteRow({ site }: { site: Site }) {
  const completed = Boolean(site.isCompleted);
  return (
    <li>
      <Link
        to={`/site?id=${site.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-orange-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-800"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              completed
                ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                : "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400"
            }`}
          >
            {completed ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {site.siteName}
            </p>
            {site.clientName && (
              <p className="text-xs text-slate-500">{site.clientName}</p>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400" />
      </Link>
    </li>
  );
}

export default function SitesPage() {
  const { t } = useLanguage();
  const { sites, loading } = useSiteContext();
  const activeSites = sites.filter((s) => !s.isCompleted);
  const completedSites = sites.filter((s) => s.isCompleted);

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
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("activeSites")} ({activeSites.length})
            </h2>
            {activeSites.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">{t("noActiveSites")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {activeSites.map((site) => (
                  <SiteRow key={site.id} site={site} />
                ))}
              </ul>
            )}
          </section>

          {completedSites.length > 0 && (
            <section className="flex flex-col gap-2 border-t border-slate-200 pt-6 dark:border-slate-800">
              <h2 className="text-sm font-semibold text-slate-500">
                {t("completedSites")} ({completedSites.length})
              </h2>
              <ul className="flex flex-col gap-2 opacity-75">
                {completedSites.map((site) => (
                  <SiteRow key={site.id} site={site} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
