import { createFileRoute } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useState } from "react";
import { Download, FileText, Table2, Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/_auth/export")({
  component: ExportCenter,
});

type ExportFormat = "csv" | "json" | "xlsx";
type ExportEntity = "tickets" | "tasks" | "users" | "audit_logs" | "sla_reports";
type ExportStatus = "idle" | "pending" | "done" | "error";

interface ExportJob {
  id: string;
  entity: ExportEntity;
  format: ExportFormat;
  status: ExportStatus;
  requestedAt: Date;
  filename?: string;
  rowCount?: number;
  errorMsg?: string;
}

const ENTITY_CONFIG: Record<ExportEntity, { label: string; description: string; icon: React.ReactNode }> = {
  tickets: {
    label: "Tickets",
    description: "All tickets with status, priority, assignee, and dates",
    icon: <FileText className="w-4 h-4" />,
  },
  tasks: {
    label: "Tasks",
    description: "Tasks with completion status, due dates, and assignees",
    icon: <Table2 className="w-4 h-4" />,
  },
  users: {
    label: "Users",
    description: "Agent and customer user accounts (no passwords)",
    icon: <Table2 className="w-4 h-4" />,
  },
  audit_logs: {
    label: "Audit Logs",
    description: "Full audit trail with actor, action, entity, and timestamps",
    icon: <FileText className="w-4 h-4" />,
  },
  sla_reports: {
    label: "SLA Reports",
    description: "SLA compliance and breach data per policy",
    icon: <Table2 className="w-4 h-4" />,
  },
};

const FORMAT_CONFIG: Record<ExportFormat, { label: string; mime: string }> = {
  csv: { label: "CSV", mime: "text/csv" },
  json: { label: "JSON", mime: "application/json" },
  xlsx: { label: "Excel (XLSX)", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
};

function getAuthHeaders(): Record<string, string> {
  const state = useAppStore.getState();
  const h: Record<string, string> = {};
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

function StatusBadge({ status }: { status: ExportStatus }) {
  if (status === "idle") return null;
  const map = {
    pending: { cls: "text-amber-400 bg-amber-400/10", icon: <Clock className="w-3 h-3 animate-spin" />, label: "Preparing…" },
    done: { cls: "text-emerald-400 bg-emerald-400/10", icon: <CheckCircle2 className="w-3 h-3" />, label: "Ready" },
    error: { cls: "text-red-400 bg-red-400/10", icon: <AlertCircle className="w-3 h-3" />, label: "Failed" },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${map.cls}`}>
      {map.icon}
      {map.label}
    </span>
  );
}

function ExportCenter() {
  const { success, error: toastError } = useToast();
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const requestExport = async (entity: ExportEntity, format: ExportFormat) => {
    const jobId = uid();
    const job: ExportJob = {
      id: jobId,
      entity,
      format,
      status: "pending",
      requestedAt: new Date(),
    };
    setJobs((j) => [job, ...j]);

    try {
      const params = new URLSearchParams({ format });
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await authFetch(`/api/export/${entity}?${params}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      // Try to trigger download from blob
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity}-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setJobs((j) =>
        j.map((x) =>
          x.id === jobId
            ? { ...x, status: "done", filename: a.download, rowCount: undefined }
            : x,
        ),
      );
      success(`${ENTITY_CONFIG[entity].label} exported as ${format.toUpperCase()}`);
    } catch (err: any) {
      setJobs((j) =>
        j.map((x) => (x.id === jobId ? { ...x, status: "error", errorMsg: err.message } : x)),
      );
      toastError(`Export failed — backend export endpoint pending`);
      // Mark as error but keep in history
      setJobs((j) =>
        j.map((x) =>
          x.id === jobId && x.status === "error"
            ? x
            : x.id === jobId
            ? { ...x, status: "error" }
            : x,
        ),
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">Export Center</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Download data exports in CSV, JSON, or Excel format.
        </p>
      </div>

      {/* Date range filter */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Date Range (optional)</h3>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-on-surface-variant">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              aria-label="Export date from"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-on-surface-variant">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              aria-label="Export date to"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="self-end mb-0.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors px-2 py-1.5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Export cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(ENTITY_CONFIG) as ExportEntity[]).map((entity) => {
          const cfg = ENTITY_CONFIG[entity];
          const pendingJob = jobs.find((j) => j.entity === entity && j.status === "pending");
          return (
            <div
              key={entity}
              className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-on-surface">{cfg.label}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">{cfg.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => requestExport(entity, fmt)}
                    disabled={!!pendingJob}
                    aria-label={`Export ${cfg.label} as ${fmt.toUpperCase()}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    {FORMAT_CONFIG[fmt].label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Job history */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Export History</h3>
          <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant/30 overflow-hidden">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                <Package className="w-4 h-4 text-on-surface-variant/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface">
                    {ENTITY_CONFIG[job.entity].label} · {FORMAT_CONFIG[job.format].label}
                  </p>
                  <p className="text-xs text-on-surface-variant/40">
                    {job.requestedAt.toLocaleTimeString()}
                    {job.rowCount !== undefined && ` · ${job.rowCount} rows`}
                    {job.errorMsg && ` · ${job.errorMsg}`}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-on-surface-variant/25 text-center">
        Backend export endpoints pending — downloads will work once /api/export/* routes are implemented
      </p>
    </div>
  );
}
