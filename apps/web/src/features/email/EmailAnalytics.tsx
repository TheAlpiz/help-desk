import { useQuery } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Mail, Eye, MousePointer2, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnalyticsRow {
  templateType: string | null;
  total: number;
  opens: number;
  clicks: number;
  uniqueOpens: number;
}

interface RecentSend {
  id: string;
  recipientEmail: string;
  templateType: string | null;
  subject: string | null;
  sentAt: string;
  openedAt: string | null;
  openCount: number;
  clickCount: number;
}

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: number | string; icon: React.ComponentType<any>; sub?: string }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="text-xl font-bold text-on-surface mt-0.5">{value}</p>
        {sub && <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function EmailAnalytics() {
  const { t } = useTranslation("emailAnalytics");

  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["email-analytics"],
    queryFn: () => authFetch("/api/email/analytics").then((r) => r.json()),
  });

  const { data: sendsData, isLoading: loadingSends } = useQuery({
    queryKey: ["email-sends"],
    queryFn: () => authFetch("/api/email/analytics/sends").then((r) => r.json()),
  });

  const analytics: AnalyticsRow[] = analyticsData?.data ?? [];
  const sends: RecentSend[] = sendsData?.data ?? [];

  const totals = analytics.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      opens: acc.opens + row.opens,
      clicks: acc.clicks + row.clicks,
    }),
    { total: 0, opens: 0, clicks: 0 },
  );

  const openRate = totals.total > 0 ? ((totals.opens / totals.total) * 100).toFixed(1) : "0";
  const clickRate = totals.total > 0 ? ((totals.clicks / totals.total) * 100).toFixed(1) : "0";

  const chartData = analytics
    .filter((r) => r.templateType)
    .map((r) => ({
      name: r.templateType!.replace(/_/g, " "),
      Sent: r.total,
      Opens: r.opens,
      Clicks: r.clicks,
    }));

  if (loadingAnalytics && loadingSends) {
    return <div className="p-6 text-sm text-on-surface-variant">{t("loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("stats.totalSent")} value={totals.total} icon={Mail} />
        <StatCard label={t("stats.uniqueOpens")} value={totals.opens} icon={Eye} sub={t("stats.openRate", { rate: openRate })} />
        <StatCard label={t("stats.totalClicks")} value={totals.clicks} icon={MousePointer2} sub={t("stats.clickRate", { rate: clickRate })} />
        <StatCard
          label={t("stats.bestPerformer")}
          value={analytics.length > 0 ? (analytics.reduce((a, b) => (a.opens > b.opens ? a : b)).templateType?.replace(/_/g, " ") ?? "—") : "—"}
          icon={TrendingUp}
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-surface border border-outline-variant rounded-xl p-4">
          <h3 className="text-sm font-semibold text-on-surface mb-4">{t("chart.title")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-outline-variant)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Sent" fill="#94a3b8" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Opens" fill="#2563eb" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Clicks" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent sends table */}
      <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{t("table.title")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant">{t("table.recipient")}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant">{t("table.template")}</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant">{t("table.sent")}</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-on-surface-variant">{t("table.opens")}</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-on-surface-variant">{t("table.clicks")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {sends.slice(0, 20).map((s) => (
                <tr key={s.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-4 py-2.5 text-on-surface truncate max-w-[200px]">{s.recipientEmail}</td>
                  <td className="px-4 py-2.5 text-on-surface-variant text-xs">
                    {s.templateType?.replace(/_/g, " ") ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-on-surface-variant text-xs">
                    {new Date(s.sentAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium ${s.openCount > 0 ? "text-primary" : "text-on-surface-variant"}`}>
                      {s.openCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-medium ${s.clickCount > 0 ? "text-green-600" : "text-on-surface-variant"}`}>
                      {s.clickCount}
                    </span>
                  </td>
                </tr>
              ))}
              {sends.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-on-surface-variant">
                    {t("table.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
