import { TrendingUp, TrendingDown } from "lucide-react";
import { useDailyLabourLogs } from "@/hooks/useDailyLabourLogs";
import { useSiteExpenses } from "@/hooks/useSiteExpenses";
import { useClientReceipts } from "@/hooks/useClientReceipts";

export function useNetCash(siteId: string | null) {
  const { totalLabourOutflow } = useDailyLabourLogs(siteId);
  const { total: totalExpenses } = useSiteExpenses(siteId);
  const { total: totalReceipts } = useClientReceipts(siteId);

  const netCash = totalReceipts - (totalLabourOutflow + totalExpenses);
  return { netCash, totalLabourOutflow, totalExpenses, totalReceipts };
}

export default function NetCashBadge({ siteId }: { siteId: string }) {
  const { netCash } = useNetCash(siteId);

  const positive = netCash >= 0;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
        positive
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
      }`}
    >
      {positive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      ₹{Math.abs(netCash).toLocaleString("en-IN")}
    </div>
  );
}
