import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui";

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
// ─── Helpers ─────────────────────────────────────────────────────────────
const getArray = (res: any): any[] => {
  if (!res) return [];
  const r = res.data ?? res;
  return Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);
};

// ─── Shared design tokens ─────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  assigned: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  in_progress: "bg-primary/15 text-primary border border-primary/20",
  waiting_customer: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  resolved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  closed: "bg-white/8 text-on-surface-variant border border-white/10",
  reopened: "bg-red-500/15 text-red-300 border border-red-500/20",
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
  const { t } = useTranslation("dashboard");
  const { t: tTickets } = useTranslation("tickets");
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <h3 className="text-sm font-semibold text-on-surface">
          {t("recentTickets")}
        </h3>
        <Link
          to="/tickets"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          {t("viewAll")} <ArrowRight className="w-3 h-3" />
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
          {t("noTickets")}
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
                className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${STATUS_CLS[ticket.status] ?? "bg-white/8 text-on-surface-variant"}`}
              >
                {tTickets(`statuses.${ticket.status}`, { defaultValue: ticket.status })}
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
  const { t } = useTranslation("dashboard");
  const { t: tTickets } = useTranslation("tickets");
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

  const tickets = getArray(ticketsData);
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
        <h1 className="text-[15px] font-semibold text-on-surface">{t("admin.title")}</h1>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("newTicket")}
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t("admin.openTickets")}
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
          trend={t("admin.openTicketsTrend")}
        />
        <MetricCard
          label={t("admin.critical")}
          value={critical.length}
          icon={<AlertCircle className="w-4 h-4" />}
          accent={critical.length > 0 ? "text-red-400" : "text-on-surface"}
          loading={tl}
          trend={t("admin.criticalTrend")}
        />
        <MetricCard
          label={t("admin.unassigned")}
          value={unassigned.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={unassigned.length > 0 ? "text-amber-400" : "text-on-surface"}
          loading={tl}
          trend={t("admin.unassignedTrend")}
        />
        <MetricCard
          label={t("admin.activeUsers")}
          value={users.length}
          icon={<Users className="w-4 h-4" />}
          loading={ul}
          trend={t("admin.slaPolicies", { count: slas.length })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTicketsTable tickets={tickets} loading={tl} />

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            {t("ticketBreakdown")} (Status)
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {tickets.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-on-surface-variant/40">
                {t("noTicketData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(
                      tickets.reduce((acc: any, t: any) => {
                        acc[t.status] = (acc[t.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([name, value]) => ({ name: tTickets(`statuses.${name}`, { defaultValue: name }), value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(
                      tickets.reduce((acc: any, t: any) => {
                        acc[t.status] = (acc[t.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map((entry, index) => {
                      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col mt-4 lg:mt-0">
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            Priority Distribution
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {tickets.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-on-surface-variant/40">
                {t("noTicketData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(
                    tickets.reduce((acc: any, t: any) => {
                      const p = t.priority || "none";
                      acc[p] = (acc[p] ?? 0) + 1;
                      return acc;
                    }, {})
                  ).map(([name, value]) => ({ name: tTickets(`priorities.${name}`, { defaultValue: name }), value }))}
                  margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#334155', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Supervisor Dashboard ─────────────────────────────────────────────────────

export function SupervisorDashboard() {
  const { t } = useTranslation("dashboard");
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

  const tickets = getArray(data);
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
        {t("supervisor.title")}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label={t("supervisor.unassigned")}
          value={unassigned.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={unassigned.length > 0 ? "text-amber-400" : "text-on-surface"}
          loading={tl}
        />
        <MetricCard
          label={t("supervisor.openTickets")}
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
        />
        <MetricCard
          label={t("supervisor.resolved24h")}
          value={resolved24h.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={tl}
        />
        <MetricCard
          label={t("supervisor.teamMembers")}
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
  const { t } = useTranslation("dashboard");
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

  const tickets = getArray(ticketsData);
  const tasks = getArray(tasksData);

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
          {t("agent.title")}
        </h1>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("newTicket")}
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label={t("agent.myOpenTickets")}
          value={openTickets.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={tl}
        />
        <MetricCard
          label={t("agent.pendingTasks")}
          value={pendingTasks.length}
          icon={<TrendingUp className="w-4 h-4" />}
          accent={
            pendingTasks.length > 0 ? "text-amber-400" : "text-on-surface"
          }
          loading={taskl}
        />
        <MetricCard
          label={t("agent.resolved")}
          value={resolvedTickets.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={tl}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecentTicketsTable tickets={openTickets} loading={tl} />
        
        <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-semibold text-on-surface mb-4">
            {t("agent.myOpenTickets")} (Status)
          </h3>
          <div className="flex-1 min-h-[250px] relative">
            {openTickets.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-on-surface-variant/40">
                {t("noTicketData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(
                      openTickets.reduce((acc: any, t: any) => {
                        acc[t.status] = (acc[t.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.keys(
                      openTickets.reduce((acc: any, t: any) => {
                        acc[t.status] = (acc[t.status] ?? 0) + 1;
                        return acc;
                      }, {})
                    ).map((entry, index) => {
                      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Requester Dashboard ──────────────────────────────────────────────────────

export function RequesterDashboard() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.tickets.index.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });

  const tickets = getArray(data);
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
          {t("requester.title")}
        </h1>
        <Button onClick={() => navigate({ to: "/tickets" })}>
          <Plus className="w-3.5 h-3.5" />
          {t("newRequest")}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard
          label={t("requester.open")}
          value={open.length}
          icon={<Ticket className="w-4 h-4" />}
          accent="text-primary"
          loading={isLoading}
        />
        <MetricCard
          label={t("requester.resolved")}
          value={resolved.length}
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="text-emerald-400"
          loading={isLoading}
        />
        <MetricCard
          label={t("requester.total")}
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
