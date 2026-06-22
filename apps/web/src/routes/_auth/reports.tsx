import { createFileRoute } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, TrendingUp, CheckCircle2, Clock, Users, Download, Bookmark, Trash2, Play, Plus, X, Filter, ChevronDown as ChDown, Sliders, CalendarClock } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";
import { ComingSoon } from "@/components/ComingSoon";
import { EmailAnalytics } from "@/features/email/EmailAnalytics";

export const Route = createFileRoute("/_auth/reports")({
  component: ReportsPage,
});

function StatCard({
  label,
  value,
  icon,
  accent = "text-on-surface",
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-on-surface-variant">{label}</span>
        <span className="text-on-surface-variant/40">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</div>
      )}
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-on-surface-variant truncate capitalize shrink-0">
        {label.replace(/_/g, " ")}
      </span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-on-surface-variant/60 w-8 text-right shrink-0">{count}</span>
    </div>
  );
}

const DATE_PRESET_DAYS = [7, 30, 90, 365];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function DateRangeFilter({
  from, to, onChange,
}: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  const { t } = useTranslation("reports");
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-on-surface-variant/50">{t("dashboard.range")}</span>
      {DATE_PRESET_DAYS.map((days) => {
        const f = toIso(new Date(Date.now() - days * 86400000));
        const todayIso = toIso(new Date());
        const active = from === f && to === todayIso;
        return (
          <button
            key={days}
            onClick={() => onChange(f, todayIso)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${active ? "bg-primary/15 border-primary/30 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/25"}`}
          >
            {t(`dashboard.presets.${days}`)}
          </button>
        );
      })}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="px-2 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          aria-label={t("dashboard.dateFrom")}
        />
        <span className="text-on-surface-variant/40 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="px-2 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          aria-label={t("dashboard.dateTo")}
        />
      </div>
    </div>
  );
}

function ReportsDashboard() {
  const { t } = useTranslation("reports");
  const { accessToken, tenantId } = useAppStore();
  const [dateFrom, setDateFrom] = useState(toIso(new Date(Date.now() - 30 * 86400000)));
  const [dateTo, setDateTo] = useState(toIso(new Date()));

  const dateParams = { from: dateFrom, to: dateTo };

  const { data: ticketSummary, isLoading: tl } = useQuery({
    queryKey: ["analytics", "tickets-summary", dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.analytics["tickets-summary"].$get({ query: dateParams });
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed");
      return body;
    },
  });

  const { data: slaData, isLoading: sl } = useQuery({
    queryKey: ["analytics", "sla-compliance", dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.analytics["sla-compliance"].$get({ query: dateParams });
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed");
      return body;
    },
  });

  const { data: agentData, isLoading: al } = useQuery({
    queryKey: ["analytics", "agent-performance", dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.analytics["agent-performance"].$get({ query: dateParams });
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed");
      return body;
    },
  });

  const { data: taskData, isLoading: tkl } = useQuery({
    queryKey: ["analytics", "task-completion", dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.analytics["task-completion"].$get({ query: dateParams });
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed");
      return body;
    },
  });

  const byStatus: Array<{ status: string; count: number }> =
    (ticketSummary as any)?.data?.byStatus ?? [];
  const totalTickets = byStatus.reduce((s, r) => s + Number(r.count), 0);
  const resolved =
    byStatus.find((r) => r.status === "resolved")?.count ?? 0;
  const resolutionRate = totalTickets > 0 ? Math.round((Number(resolved) / totalTickets) * 100) : 0;

  const slaStats = (slaData as any)?.data ?? {};
  const slaCompliance = slaStats.firstResponseComplianceRate ?? 0;

  const agentStats: Array<{ agentId: string | null; resolvedCount: number }> =
    (agentData as any)?.data?.resolvedStats ?? [];

  const taskStats = (taskData as any)?.data ?? {};
  const taskCompletionRate = taskStats.completionRate ?? 0;

  const exportCsv = () => {
    const rows = [
      ["status", "count"],
      ...byStatus.map((r) => [r.status, r.count]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ticket-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const PRIORITY_COLORS: Record<string, string> = {
    critical: "bg-red-500/60",
    high: "bg-orange-500/60",
    medium: "bg-yellow-500/60",
    low: "bg-white/20",
  };

  const STATUS_COLORS: Record<string, string> = {
    open: "bg-blue-500/60",
    assigned: "bg-violet-500/60",
    in_progress: "bg-primary/60",
    waiting_customer: "bg-amber-500/60",
    resolved: "bg-emerald-500/60",
    closed: "bg-white/20",
    reopened: "bg-red-500/60",
  };

  const byDept: Array<{ departmentId: string | null; count: number }> =
    (ticketSummary as any)?.data?.byDepartment ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-[15px] font-semibold text-on-surface">{t("dashboard.title")}</h1>
        <button
          onClick={exportCsv}
          disabled={tl || byStatus.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t("dashboard.exportCsv")}
        </button>
      </div>
      <DateRangeFilter
        from={dateFrom}
        to={dateTo}
        onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={t("dashboard.kpi.totalTickets")} value={totalTickets} icon={<BarChart3 className="w-4 h-4" />} loading={tl} />
        <StatCard
          label={t("dashboard.kpi.resolutionRate")}
          value={`${resolutionRate}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent={resolutionRate >= 70 ? "text-emerald-400" : "text-amber-400"}
          loading={tl}
        />
        <StatCard
          label={t("dashboard.kpi.slaCompliance")}
          value={`${Math.round(Number(slaCompliance))}%`}
          icon={<Clock className="w-4 h-4" />}
          accent={Number(slaCompliance) >= 80 ? "text-emerald-400" : "text-red-400"}
          loading={sl}
        />
        <StatCard
          label={t("dashboard.kpi.taskCompletion")}
          value={`${Math.round(Number(taskCompletionRate))}%`}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent={Number(taskCompletionRate) >= 70 ? "text-emerald-400" : "text-amber-400"}
          loading={tkl}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-4">{t("dashboard.charts.byStatus")}</h3>
          {tl ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />)}</div>
          ) : byStatus.length === 0 ? (
            <EmptyChart />
          ) : (
            <div className="space-y-2.5">
              {byStatus
                .sort((a, b) => Number(b.count) - Number(a.count))
                .map((r) => (
                  <BarRow
                    key={r.status}
                    label={r.status}
                    count={Number(r.count)}
                    total={totalTickets}
                    color={STATUS_COLORS[r.status] ?? "bg-primary/60"}
                  />
                ))}
            </div>
          )}
        </div>

        {/* SLA details */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-4">{t("dashboard.charts.slaCompliance")}</h3>
          {sl ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">{t("dashboard.sla.firstResponse")}</span>
                  <span className="text-xs font-semibold text-on-surface">{Math.round(Number(slaCompliance))}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${Number(slaCompliance) >= 80 ? "bg-emerald-500/70" : "bg-red-500/70"}`}
                    style={{ width: `${Math.min(100, Number(slaCompliance))}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/3 rounded-lg p-3">
                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{t("dashboard.sla.withSla")}</p>
                  <p className="text-lg font-bold text-on-surface mt-1">
                    {slaStats.totalWithFirstResponseSla ?? 0}
                  </p>
                </div>
                <div className="bg-white/3 rounded-lg p-3">
                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{t("dashboard.sla.met")}</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1">
                    {slaStats.metFirstResponseSla ?? 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Agent performance */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface">{t("dashboard.charts.agentPerformance")}</h3>
            <Users className="w-4 h-4 text-on-surface-variant/40" />
          </div>
          {al ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}</div>
          ) : agentStats.length === 0 ? (
            <EmptyChart label={t("dashboard.emptyAgents")} />
          ) : (
            <div className="space-y-2">
              {agentStats
                .sort((a, b) => Number(b.resolvedCount) - Number(a.resolvedCount))
                .slice(0, 8)
                .map((s) => (
                  <div key={s.agentId ?? "unassigned"} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                      {s.agentId ? s.agentId.slice(0, 1).toUpperCase() : "?"}
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant flex-1 truncate">
                      {s.agentId?.slice(0, 8) ?? t("dashboard.agent.unassigned")}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">{t("dashboard.agent.resolved", { count: s.resolvedCount })}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Task completion */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-4">{t("dashboard.charts.taskCompletion")}</h3>
          {tkl ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">{t("dashboard.task.completionRate")}</span>
                  <span className="text-xs font-semibold text-on-surface">{Math.round(Number(taskCompletionRate))}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(taskCompletionRate))}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: t("dashboard.task.total"), value: taskStats.total ?? 0, color: "text-on-surface" },
                  { label: t("dashboard.task.completed"), value: taskStats.completed ?? 0, color: "text-emerald-400" },
                  { label: t("dashboard.task.overdue"), value: taskStats.overdue ?? 0, color: "text-red-400" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/3 rounded-lg p-3">
                    <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{s.label}</p>
                    <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label?: string }) {
  const { t } = useTranslation("reports");
  const text = label ?? t("dashboard.empty");
  return (
    <div className="h-40 flex items-center justify-center border border-dashed border-outline-variant rounded-lg">
      <p className="text-xs text-on-surface-variant/40">{text}</p>
    </div>
  );
}

// ─── Saved / Scheduled / Builder placeholders ─────────────────────────────────

function SavedReports() {
  const { t } = useTranslation("reports");
  return (
    <ComingSoon
      icon={Bookmark}
      title={t("saved.title")}
      description={t("saved.description")}
      features={[
        { icon: Bookmark, label: t("saved.features.saveLabel"), description: t("saved.features.saveDesc") },
        { icon: Download, label: t("saved.features.exportLabel"), description: t("saved.features.exportDesc") },
      ]}
    />
  );
}

function ReportBuilder() {
  const { t } = useTranslation("reports");
  return (
    <ComingSoon
      icon={Sliders}
      title={t("builder.title")}
      description={t("builder.description")}
      features={[
        { icon: Filter, label: t("builder.features.datasetLabel"), description: t("builder.features.datasetDesc") },
        { icon: Sliders, label: t("builder.features.groupingLabel"), description: t("builder.features.groupingDesc") },
        { icon: Download, label: t("builder.features.exportLabel"), description: t("builder.features.exportDesc") },
      ]}
    />
  );
}

function ScheduledReports() {
  const { t } = useTranslation("reports");
  return (
    <ComingSoon
      icon={CalendarClock}
      title={t("scheduled.title")}
      description={t("scheduled.description")}
      features={[
        { icon: CalendarClock, label: t("scheduled.features.schedulingLabel"), description: t("scheduled.features.schedulingDesc") },
        { icon: Users, label: t("scheduled.features.deliveryLabel"), description: t("scheduled.features.deliveryDesc") },
      ]}
    />
  );
}

export function ReportsPage() {
  const { t } = useTranslation("reports");
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
        <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-0.5">
          {["analytics", "email", "builder", "scheduled", "saved"].map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t(`tabs.${key}`)}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "analytics" && <ReportsDashboard />}
      {activeTab === "email" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-[15px] font-semibold text-on-surface">Email Analytics</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Open and click tracking across all sent emails.
            </p>
          </div>
          <EmailAnalytics />
        </div>
      )}
      {activeTab === "builder" && <ReportBuilder />}
      {activeTab === "scheduled" && <ScheduledReports />}
      {activeTab === "saved" && <SavedReports />}
    </div>
  );
}
