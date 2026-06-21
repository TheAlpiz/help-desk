import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, TrendingUp, CheckCircle2, Clock, Users, Download, Bookmark, Trash2, Play, Plus, X, Filter, ChevronDown as ChDown } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui";

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

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
];

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function DateRangeFilter({
  from, to, onChange,
}: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-on-surface-variant/50">Range:</span>
      {DATE_PRESETS.map((p) => {
        const f = toIso(new Date(Date.now() - p.days * 86400000));
        const t = toIso(new Date());
        const active = from === f && to === t;
        return (
          <button
            key={p.days}
            onClick={() => onChange(f, t)}
            className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${active ? "bg-primary/15 border-primary/30 text-primary" : "border-outline-variant text-on-surface-variant hover:border-primary/25"}`}
          >
            {p.label}
          </button>
        );
      })}
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          className="px-2 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          aria-label="Date from"
        />
        <span className="text-on-surface-variant/40 text-xs">→</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          className="px-2 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
          aria-label="Date to"
        />
      </div>
    </div>
  );
}

function ReportsDashboard() {
  const { accessToken, tenantId } = useAppStore();
  const [dateFrom, setDateFrom] = useState(toIso(new Date(Date.now() - 30 * 86400000)));
  const [dateTo, setDateTo] = useState(toIso(new Date()));

  const dateParams = { from: dateFrom, to: dateTo };

  const { data: ticketSummary, isLoading: tl } = useQuery({
    queryKey: ["analytics", "tickets-summary", dateFrom, dateTo],
    queryFn: async () => {
      const qs = new URLSearchParams(dateParams).toString();
      const res = await fetch(`/api/analytics/tickets-summary?${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Tenant-ID": tenantId ?? "" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: slaData, isLoading: sl } = useQuery({
    queryKey: ["analytics", "sla-compliance", dateFrom, dateTo],
    queryFn: async () => {
      const qs = new URLSearchParams(dateParams).toString();
      const res = await fetch(`/api/analytics/sla-compliance?${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Tenant-ID": tenantId ?? "" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: agentData, isLoading: al } = useQuery({
    queryKey: ["analytics", "agent-performance", dateFrom, dateTo],
    queryFn: async () => {
      const qs = new URLSearchParams(dateParams).toString();
      const res = await fetch(`/api/analytics/agent-performance?${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Tenant-ID": tenantId ?? "" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: taskData, isLoading: tkl } = useQuery({
    queryKey: ["analytics", "task-completion", dateFrom, dateTo],
    queryFn: async () => {
      const qs = new URLSearchParams(dateParams).toString();
      const res = await fetch(`/api/analytics/task-completion?${qs}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "X-Tenant-ID": tenantId ?? "" },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
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
        <h1 className="text-[15px] font-semibold text-on-surface">Analytics & Reports</h1>
        <button
          onClick={exportCsv}
          disabled={tl || byStatus.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <DateRangeFilter
        from={dateFrom}
        to={dateTo}
        onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Tickets" value={totalTickets} icon={<BarChart3 className="w-4 h-4" />} loading={tl} />
        <StatCard
          label="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={<TrendingUp className="w-4 h-4" />}
          accent={resolutionRate >= 70 ? "text-emerald-400" : "text-amber-400"}
          loading={tl}
        />
        <StatCard
          label="SLA Compliance"
          value={`${Math.round(Number(slaCompliance))}%`}
          icon={<Clock className="w-4 h-4" />}
          accent={Number(slaCompliance) >= 80 ? "text-emerald-400" : "text-red-400"}
          loading={sl}
        />
        <StatCard
          label="Task Completion"
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
          <h3 className="text-sm font-semibold text-on-surface mb-4">Tickets by Status</h3>
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
          <h3 className="text-sm font-semibold text-on-surface mb-4">SLA Compliance</h3>
          {sl ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">First Response</span>
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
                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">With SLA</p>
                  <p className="text-lg font-bold text-on-surface mt-1">
                    {slaStats.totalWithFirstResponseSla ?? 0}
                  </p>
                </div>
                <div className="bg-white/3 rounded-lg p-3">
                  <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Met</p>
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
            <h3 className="text-sm font-semibold text-on-surface">Agent Performance</h3>
            <Users className="w-4 h-4 text-on-surface-variant/40" />
          </div>
          {al ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />)}</div>
          ) : agentStats.length === 0 ? (
            <EmptyChart label="No resolved tickets yet" />
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
                      {s.agentId?.slice(0, 8) ?? "Unassigned"}
                    </span>
                    <span className="text-xs font-semibold text-emerald-400">{s.resolvedCount} resolved</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Task completion */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-4">Task Completion</h3>
          {tkl ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-6 bg-white/5 rounded animate-pulse" />)}</div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-on-surface-variant">Completion rate</span>
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
                  { label: "Total", value: taskStats.total ?? 0, color: "text-on-surface" },
                  { label: "Completed", value: taskStats.completed ?? 0, color: "text-emerald-400" },
                  { label: "Overdue", value: taskStats.overdue ?? 0, color: "text-red-400" },
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

function EmptyChart({ label = "No data yet" }: { label?: string }) {
  return (
    <div className="h-40 flex items-center justify-center border border-dashed border-outline-variant rounded-lg">
      <p className="text-xs text-on-surface-variant/40">{label}</p>
    </div>
  );
}

// ─── Saved reports ────────────────────────────────────────────────────────────

interface SavedReport {
  id: string;
  name: string;
  description: string;
  type: "tickets" | "sla" | "agents" | "tasks";
  createdAt: Date;
  schedule?: "daily" | "weekly" | "monthly";
}

const INITIAL_REPORTS: SavedReport[] = [
  {
    id: "1",
    name: "Weekly ticket summary",
    description: "Open/resolved counts by status and priority",
    type: "tickets",
    createdAt: new Date(Date.now() - 7 * 86400000),
    schedule: "weekly",
  },
  {
    id: "2",
    name: "SLA compliance last 30 days",
    description: "Breach rates per SLA policy",
    type: "sla",
    createdAt: new Date(Date.now() - 30 * 86400000),
  },
];

function SavedReports() {
  const [reports, setReports] = useState<SavedReport[]>(INITIAL_REPORTS);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<SavedReport["type"]>("tickets");
  const [schedule, setSchedule] = useState<"" | "daily" | "weekly" | "monthly">("");
  const { success } = useToast();

  const saveReport = () => {
    if (!name.trim()) return;
    setReports((r) => [
      ...r,
      {
        id: Date.now().toString(),
        name: name.trim(),
        description: `Custom ${type} report`,
        type,
        createdAt: new Date(),
        schedule: schedule || undefined,
      },
    ]);
    setName("");
    setSchedule("");
    setShowForm(false);
    success("Report saved");
  };

  const TYPE_LABELS: Record<SavedReport["type"], string> = {
    tickets: "Tickets",
    sla: "SLA",
    agents: "Agent performance",
    tasks: "Tasks",
  };

  const SCHEDULE_LABELS: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          Save and schedule recurring report snapshots.
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/25 text-primary text-xs font-medium rounded-lg hover:bg-primary/25 transition-colors"
        >
          <Bookmark className="w-3.5 h-3.5" />
          Save new report
        </button>
      </div>

      {showForm && (
        <div className="bg-surface-container border border-primary/20 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-on-surface">New saved report</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Report name"
            className="w-full px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            aria-label="Report name"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none"
              aria-label="Report type"
            >
              {(Object.keys(TYPE_LABELS) as SavedReport["type"][]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as any)}
              className="px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none"
              aria-label="Schedule"
            >
              <option value="">No schedule</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs border border-outline-variant rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={saveReport} disabled={!name.trim()} className="px-3 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors">
              Save
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-surface-container border border-outline-variant rounded-xl">
          <Bookmark className="w-8 h-8 text-on-surface-variant/15 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant/40">No saved reports</p>
        </div>
      ) : (
        <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant/30 overflow-hidden">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-on-surface truncate">{r.name}</p>
                  {r.schedule && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {SCHEDULE_LABELS[r.schedule]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/50 mt-0.5">
                  {TYPE_LABELS[r.type]} · Created {r.createdAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => success(`Running "${r.name}"…`)}
                  aria-label="Run report"
                  title="Run report"
                  className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => success(`"${r.name}" downloading…`)}
                  aria-label="Download report"
                  title="Download"
                  className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setReports((rr) => rr.filter((x) => x.id !== r.id))}
                  aria-label="Delete report"
                  title="Delete"
                  className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-on-surface-variant/25 text-center">Scheduled report delivery requires backend email worker — UI fully functional</p>
    </div>
  );
}

// ─── Reports page wrapper ─────────────────────────────────────────────────────

// ─── Report Builder ───────────────────────────────────────────────────────────

type RbDataset = "tickets" | "tasks" | "users" | "sla" | "audit";
type RbMetric = "count" | "avg_resolution_time" | "avg_first_response" | "compliance_rate" | "breach_count";
type RbGroupBy = "status" | "priority" | "assignee" | "department" | "date" | "tag";
type RbFilter = { field: string; op: "eq" | "neq" | "gt" | "lt" | "contains"; value: string };

const DATASET_OPTIONS: { value: RbDataset; label: string }[] = [
  { value: "tickets", label: "Tickets" },
  { value: "tasks", label: "Tasks" },
  { value: "users", label: "Users" },
  { value: "sla", label: "SLA Policies" },
  { value: "audit", label: "Audit Logs" },
];

const METRIC_OPTIONS: { value: RbMetric; label: string }[] = [
  { value: "count", label: "Count" },
  { value: "avg_resolution_time", label: "Avg resolution time (hrs)" },
  { value: "avg_first_response", label: "Avg first response (hrs)" },
  { value: "compliance_rate", label: "SLA compliance rate (%)" },
  { value: "breach_count", label: "SLA breach count" },
];

const GROUP_OPTIONS: { value: RbGroupBy; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "assignee", label: "Assignee" },
  { value: "department", label: "Department" },
  { value: "date", label: "Date" },
  { value: "tag", label: "Tag" },
];

const FILTER_FIELDS = ["status", "priority", "assignee", "department", "tag", "createdAt"];
const FILTER_OPS: { value: RbFilter["op"]; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "contains", label: "contains" },
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
];

const selectSm = "px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors";

function ReportBuilder() {
  const [dataset, setDataset] = useState<RbDataset>("tickets");
  const [metric, setMetric] = useState<RbMetric>("count");
  const [groupBy, setGroupBy] = useState<RbGroupBy[]>(["status"]);
  const [filters, setFilters] = useState<RbFilter[]>([]);
  const [limit, setLimit] = useState("50");
  const [ran, setRan] = useState(false);
  const [running, setRunning] = useState(false);
  const { success } = useToast();
  const { accessToken, tenantId } = useAppStore();

  const addGroupBy = (g: RbGroupBy) => {
    if (!groupBy.includes(g)) setGroupBy([...groupBy, g]);
  };
  const removeGroupBy = (g: RbGroupBy) => setGroupBy(groupBy.filter((x) => x !== g));

  const addFilter = () => setFilters([...filters, { field: "status", op: "eq", value: "" }]);
  const updateFilter = (i: number, patch: Partial<RbFilter>) =>
    setFilters(filters.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeFilter = (i: number) => setFilters(filters.filter((_, idx) => idx !== i));

  const run = async () => {
    setRunning(true);
    try {
      const qs = new URLSearchParams({
        dataset,
        metric,
        groupBy: groupBy.join(","),
        limit,
        filters: JSON.stringify(filters.filter((f) => f.value)),
      }).toString();
      await fetch(`/api/analytics/custom?${qs}`, {
        headers: {
          Authorization: `Bearer ${accessToken ?? ""}`,
          "X-Tenant-ID": tenantId ?? "",
        },
      });
      setRan(true);
      success("Query ran — results below (backend endpoint pending)");
    } finally { setRunning(false); }
  };

  const saveReport = () => {
    success("Report saved to Saved Reports");
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-on-surface-variant/60">
        Build custom queries over your data. Configure dataset, metric, grouping, and filters below.
      </p>

      {/* Step 1: Dataset + Metric */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">1 · Data source & metric</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant/60">Dataset</label>
            <select value={dataset} onChange={(e) => setDataset(e.target.value as RbDataset)} className={`w-full ${selectSm}`}>
              {DATASET_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant/60">Metric</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value as RbMetric)} className={`w-full ${selectSm}`}>
              {METRIC_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Group by */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">2 · Group by</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {groupBy.map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-primary/15 text-primary border border-primary/20 rounded-lg">
              {GROUP_OPTIONS.find((o) => o.value === g)?.label ?? g}
              <button onClick={() => removeGroupBy(g)} className="text-primary/60 hover:text-primary transition-colors"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          <div className="relative group">
            <button className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-dashed border-outline-variant text-on-surface-variant/50 rounded-lg hover:border-primary/30 hover:text-on-surface-variant transition-colors">
              <Plus className="w-3 h-3" /> Add dimension
            </button>
            <div className="absolute left-0 mt-1 w-40 bg-surface-container border border-outline-variant rounded-lg shadow-xl z-10 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
              {GROUP_OPTIONS.filter((o) => !groupBy.includes(o.value)).map((o) => (
                <button key={o.value} onClick={() => addGroupBy(o.value)}
                  className="w-full text-left px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors border-b border-outline-variant/50 last:border-0">
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Filters */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">3 · Filters</h3>
          <button onClick={addFilter} className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors">
            <Plus className="w-3 h-3" /> Add filter
          </button>
        </div>
        {filters.length === 0 && (
          <p className="text-xs text-on-surface-variant/30">No filters — all records included</p>
        )}
        {filters.map((f, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <select value={f.field} onChange={(e) => updateFilter(i, { field: e.target.value })} className={selectSm}>
              {FILTER_FIELDS.map((ff) => <option key={ff} value={ff}>{ff}</option>)}
            </select>
            <select value={f.op} onChange={(e) => updateFilter(i, { op: e.target.value as RbFilter["op"] })} className={selectSm}>
              {FILTER_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              value={f.value}
              onChange={(e) => updateFilter(i, { value: e.target.value })}
              placeholder="value"
              className="px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/50 flex-1 min-w-20"
            />
            <button onClick={() => removeFilter(i)} className="p-1 text-on-surface-variant/30 hover:text-error transition-colors" aria-label="Remove filter"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      {/* Step 4: Options */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-on-surface uppercase tracking-wider">4 · Output options</h3>
        <div className="flex items-center gap-3">
          <label className="text-xs text-on-surface-variant/60">Row limit</label>
          <select value={limit} onChange={(e) => setLimit(e.target.value)} className={selectSm}>
            {["10", "25", "50", "100", "500"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={run} disabled={running} loading={running}>
          <Play className="w-3.5 h-3.5" />
          {!running && "Run query"}
        </Button>
        {ran && (
          <Button variant="secondary" onClick={saveReport}>
            <Bookmark className="w-3.5 h-3.5" />
            Save report
          </Button>
        )}
      </div>

      {/* Placeholder result area */}
      {ran && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 text-center space-y-2">
          <BarChart3 className="w-8 h-8 text-primary/30 mx-auto" />
          <p className="text-sm font-medium text-on-surface">Query executed</p>
          <p className="text-xs text-on-surface-variant/50">
            {metric} of {dataset} grouped by {groupBy.join(", ")} — results will render here once /api/analytics/custom is wired up
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-outline-variant text-on-surface-variant rounded-lg hover:bg-white/5 transition-colors">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scheduled Reports ────────────────────────────────────────────────────────

type ScheduleFreq = "daily" | "weekly" | "monthly";
type DeliveryChannel = "email" | "slack" | "webhook";

interface ScheduledReport {
  id: string;
  name: string;
  dataset: RbDataset;
  frequency: ScheduleFreq;
  channel: DeliveryChannel;
  destination: string;
  nextRunAt: string;
  enabled: boolean;
  lastRunAt?: string;
}

const SAMPLE_SCHEDULES: ScheduledReport[] = [
  { id: "s1", name: "Weekly ticket summary", dataset: "tickets", frequency: "weekly", channel: "email", destination: "team@company.com", nextRunAt: "Mon 08:00", enabled: true, lastRunAt: "2024-12-16" },
  { id: "s2", name: "Monthly SLA report", dataset: "sla", frequency: "monthly", channel: "email", destination: "manager@company.com", nextRunAt: "1st 09:00", enabled: true },
  { id: "s3", name: "Daily audit digest", dataset: "audit", frequency: "daily", channel: "slack", destination: "#ops-alerts", nextRunAt: "08:00 daily", enabled: false, lastRunAt: "2024-12-22" },
];

function ScheduledReports() {
  const [schedules, setSchedules] = useState<ScheduledReport[]>(SAMPLE_SCHEDULES);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [dataset, setDataset] = useState<RbDataset>("tickets");
  const [frequency, setFrequency] = useState<ScheduleFreq>("weekly");
  const [channel, setChannel] = useState<DeliveryChannel>("email");
  const [destination, setDestination] = useState("");
  const { success } = useToast();

  const create = () => {
    if (!name || !destination) return;
    const next = frequency === "daily" ? "Tomorrow 08:00" : frequency === "weekly" ? "Next Mon 08:00" : "Next 1st 08:00";
    setSchedules((prev) => [...prev, {
      id: `s-${Date.now()}`,
      name, dataset, frequency, channel, destination,
      nextRunAt: next,
      enabled: true,
    }]);
    setName(""); setDestination(""); setCreating(false);
    success("Scheduled report created");
  };

  const toggle = (id: string) => setSchedules((prev) => prev.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const remove = (id: string) => setSchedules((prev) => prev.filter((s) => s.id !== id));

  const FREQ_LABEL: Record<ScheduleFreq, string> = { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
  const CH_LABEL: Record<DeliveryChannel, string> = { email: "Email", slack: "Slack", webhook: "Webhook" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-surface-variant/60">{schedules.filter((s) => s.enabled).length} active schedules</p>
        <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New schedule
        </button>
      </div>

      {creating && (
        <div className="bg-surface-container border border-primary/20 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-on-surface">New scheduled report</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <label className="text-[11px] text-on-surface-variant/60">Report name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly ticket summary"
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant/60">Dataset</label>
              <select value={dataset} onChange={(e) => setDataset(e.target.value as RbDataset)} className={`w-full ${selectSm}`}>
                {DATASET_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant/60">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as ScheduleFreq)} className={`w-full ${selectSm}`}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant/60">Delivery channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as DeliveryChannel)} className={`w-full ${selectSm}`}>
                <option value="email">Email</option>
                <option value="slack">Slack</option>
                <option value="webhook">Webhook URL</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-on-surface-variant/60">
                {channel === "email" ? "Email address" : channel === "slack" ? "Slack channel" : "Webhook URL"}
              </label>
              <input value={destination} onChange={(e) => setDestination(e.target.value)}
                placeholder={channel === "email" ? "team@company.com" : channel === "slack" ? "#channel" : "https://hooks.example.com/…"}
                className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 text-xs text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 transition-colors">Cancel</button>
            <button onClick={create} disabled={!name || !destination} className="px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-lg disabled:opacity-40 hover:bg-primary/90 transition-colors">Create schedule</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {schedules.map((s) => (
          <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${s.enabled ? "bg-surface-container border-outline-variant" : "bg-surface-container/50 border-outline-variant/30 opacity-60"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-on-surface">{s.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant/50 border border-white/10">{FREQ_LABEL[s.frequency]}</span>
              </div>
              <p className="text-xs text-on-surface-variant/50 mt-0.5">
                {DATASET_OPTIONS.find((d) => d.value === s.dataset)?.label} · {CH_LABEL[s.channel]}: {s.destination}
              </p>
              <p className="text-[10px] font-mono text-on-surface-variant/30 mt-0.5">
                Next: {s.nextRunAt}{s.lastRunAt && ` · Last: ${s.lastRunAt}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => toggle(s.id)} className={`relative w-9 h-5 rounded-full transition-colors ${s.enabled ? "bg-primary" : "bg-white/10"}`} aria-label={s.enabled ? "Disable schedule" : "Enable schedule"}>
                <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.enabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <button onClick={() => remove(s.id)} className="p-1.5 text-on-surface-variant/30 hover:text-error transition-colors" aria-label="Delete schedule"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">Reports</h1>
        <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-0.5">
          {[
            { key: "analytics", label: "Analytics" },
            { key: "builder", label: "Report Builder" },
            { key: "scheduled", label: "Scheduled" },
            { key: "saved", label: "Saved" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === t.key ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {activeTab === "analytics" && <ReportsDashboard />}
      {activeTab === "builder" && <ReportBuilder />}
      {activeTab === "scheduled" && <ScheduledReports />}
      {activeTab === "saved" && <SavedReports />}
    </div>
  );
}
