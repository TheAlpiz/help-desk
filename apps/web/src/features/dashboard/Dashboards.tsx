import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import {
  AlertCircle,
  AlertTriangle,
  Ticket,
  Users,
  CheckCircle2,
  TrendingUp,
  Plus,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Shared design tokens ─────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: {
    label: "Open",
    cls: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  },
  assigned: {
    label: "Assigned",
    cls: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  },
  in_progress: {
    label: "In Progress",
    cls: "bg-primary/15 text-primary border border-primary/20",
  },
  waiting_customer: {
    label: "Waiting",
    cls: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  },
  resolved: {
    label: "Resolved",
    cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  },
  closed: {
    label: "Closed",
    cls: "bg-white/8 text-on-surface-variant border border-white/10",
  },
  reopened: {
    label: "Reopened",
    cls: "bg-red-500/15 text-red-300 border border-red-500/20",
  },
};

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon,
  trend,
  loading = false,
  accent = "text-on-surface",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-on-surface-variant">
          {label}
        </span>
        <span className="text-on-surface-variant/40">{icon}</span>
      </div>
      {loading ? (
        <div className="h-8 w-16 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className={`text-2xl font-bold tracking-tight ${accent}`}>
          {value}
        </div>
      )}
      {trend && (
        <p className="text-[11px] text-on-surface-variant/50">{trend}</p>
      )}
    </div>
  );
}

// ─── Recent tickets table ─────────────────────────────────────────────────────

function RecentTicketsTable({
  tickets,
  loading,
}: {
  tickets: any[];
  loading: boolean;
}) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <h3 className="text-sm font-semibold text-on-surface">
          Recent tickets
        </h3>
        <Link
          to="/tickets"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant/40 text-sm">
          No tickets yet.
        </div>
      ) : (
        <div className="divide-y divide-outline-variant">
          {tickets.slice(0, 6).map((ticket: any) => (
            <Link
              key={ticket.id}
              to="/tickets/$ticketId"
              params={{ ticketId: ticket.id }}
              className="flex items-center gap-4 px-4 py-3 hover:bg-white/3 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate group-hover:text-primary transition-colors">
                  {ticket.subject}
                </p>
                <p className="text-xs text-on-surface-variant/50 mt-0.5 font-mono">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${STATUS_MAP[ticket.status]?.cls ?? "bg-white/8 text-on-surface-variant"}`}
              >
                {STATUS_MAP[ticket.status]?.label ?? ticket.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Admin / Platform Owner Dashboard ────────────────────────────────────────

export function AdminDashboard() {
  const { data: ticketsData, isLoading: tl } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.tickets.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: usersData, isLoading: ul } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: slaData, isLoading: sl } = useQuery({
    queryKey: ["slas"],
    queryFn: async () => {
      const res = await api.slas.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const tickets: any[] =
    (ticketsData as any)?.data?.data ?? (ticketsData as any)?.data ?? [];
  const users: any[] = (usersData as any)?.data ?? [];
  const slas: any[] = (slaData as any)?.data ?? [];

  const open = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status),
  );
  const critical = tickets.filter(
    (t) =>
      t.priority === "critical" && !["resolved", "closed"].includes(t.status),
  );
  const unassigned = tickets.filter(
    (t) => !t.assigneeId && !["resolved", "closed"].includes(t.status),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">Overview</h1>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Ticket
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Open Tickets"
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
          trend="All active, non-closed tickets"
        />
        <MetricCard
          label="Critical"
          value={critical.length}
          icon={<AlertCircle className="w-4 h-4" />}
          accent={critical.length > 0 ? "text-red-400" : "text-on-surface"}
          loading={tl}
          trend="Require immediate attention"
        />
        <MetricCard
          label="Unassigned"
          value={unassigned.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={unassigned.length > 0 ? "text-amber-400" : "text-on-surface"}
          loading={tl}
          trend="Need agent assignment"
        />
        <MetricCard
          label="Active Users"
          value={users.length}
          icon={<Users className="w-4 h-4" />}
          loading={ul}
          trend={`${slas.length} SLA polic${slas.length === 1 ? "y" : "ies"} active`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTicketsTable tickets={tickets} loading={tl} />

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            Ticket breakdown
          </h3>
          <div className="space-y-2">
            {Object.entries(
              tickets.reduce((acc: Record<string, number>, t: any) => {
                acc[t.status] = (acc[t.status] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([status, count]) => {
              const total = tickets.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-on-surface-variant truncate capitalize">
                    {status.replace("_", " ")}
                  </span>
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-on-surface-variant/60 w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
            {tickets.length === 0 && !tl && (
              <p className="text-xs text-on-surface-variant/40 text-center py-6">
                No ticket data yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Supervisor Dashboard ─────────────────────────────────────────────────────

export function SupervisorDashboard() {
  const { data, isLoading: tl } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.tickets.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: usersData, isLoading: ul } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const tickets: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const users: any[] = (usersData as any)?.data ?? [];

  const unassigned = tickets.filter(
    (t) => !t.assigneeId && !["resolved", "closed"].includes(t.status),
  );
  const open = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status),
  );
  const resolved24h = tickets.filter((t) => {
    if (t.status !== "resolved") return false;
    return (
      Date.now() - new Date(t.updatedAt ?? t.createdAt).getTime() < 86400000
    );
  });

  return (
    <div className="space-y-6">
      <h1 className="text-[15px] font-semibold text-on-surface">
        Department Overview
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Unassigned"
          value={unassigned.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={unassigned.length > 0 ? "text-amber-400" : "text-on-surface"}
          loading={tl}
        />
        <MetricCard
          label="Open Tickets"
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
        />
        <MetricCard
          label="Resolved (24h)"
          value={resolved24h.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={tl}
        />
        <MetricCard
          label="Team Members"
          value={users.length}
          icon={<Users className="w-4 h-4" />}
          loading={ul}
        />
      </div>

      <RecentTicketsTable tickets={open} loading={tl} />
    </div>
  );
}

// ─── Agent Dashboard ──────────────────────────────────────────────────────────

export function AgentDashboard() {
  const { data: ticketsData, isLoading: tl } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.tickets.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: tasksData, isLoading: taskl } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.tasks.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const tickets: any[] =
    (ticketsData as any)?.data?.data ?? (ticketsData as any)?.data ?? [];
  const tasks: any[] = (tasksData as any)?.data ?? [];

  const openTickets = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status),
  );
  const pendingTasks = tasks.filter((t) =>
    ["TODO", "IN_PROGRESS", "BLOCKED"].includes(t.status),
  );
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">
          My Workspace
        </h1>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Ticket
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="My Open Tickets"
          value={openTickets.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
        />
        <MetricCard
          label="Pending Tasks"
          value={pendingTasks.length}
          icon={<TrendingUp className="w-4 h-4" />}
          accent={
            pendingTasks.length > 0 ? "text-amber-400" : "text-on-surface"
          }
          loading={taskl}
        />
        <MetricCard
          label="Resolved"
          value={resolvedTickets.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={tl}
        />
      </div>

      <RecentTicketsTable tickets={openTickets} loading={tl} />
    </div>
  );
}

// ─── Requester Dashboard ──────────────────────────────────────────────────────

export function RequesterDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.tickets.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const tickets: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const open = tickets.filter(
    (t) => !["resolved", "closed"].includes(t.status),
  );
  const resolved = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">
          My Requests
        </h1>
        <Button onClick={() => navigate({ to: "/tickets" })}>
          <Plus className="w-3.5 h-3.5" />
          New Request
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label="Open"
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={isLoading}
        />
        <MetricCard
          label="Resolved"
          value={resolved.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={isLoading}
        />
        <MetricCard
          label="Total"
          value={tickets.length}
          icon={<BarChart3 className="w-4 h-4" />}
          loading={isLoading}
        />
      </div>

      <RecentTicketsTable tickets={tickets} loading={isLoading} />
    </div>
  );
}

// ─── Named re-exports so the lazy route can import them ──────────────────────
// (already named exports above)
