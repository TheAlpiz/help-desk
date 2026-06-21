import { useState } from "react";
import { authFetch } from "@/lib/api";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
  Plus,
  Search,
  X,
  AlertCircle,
  AlertTriangle,
  Minus,
  Ticket,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  CheckSquare,
  Square,
  XCircle,
  CheckCheck,
  Clock,
  Inbox,
  User,
  AlertOctagon,
  ChevronsUpDown,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store";
import { api } from "@/lib/api";
import { createTicketSchema } from "@help-desk/shared";
import { ErrorState, getErrorVariant } from "@/components/ErrorState";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

export const Route = createFileRoute("/_auth/tickets/")({
  component: TicketsList,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-blue-500/15 text-blue-300 border border-blue-500/20" },
  assigned: { label: "Assigned", cls: "bg-violet-500/15 text-violet-300 border border-violet-500/20" },
  in_progress: { label: "In Progress", cls: "bg-primary/15 text-primary border border-primary/20" },
  waiting_customer: { label: "Waiting", cls: "bg-amber-500/15 text-amber-300 border border-amber-500/20" },
  resolved: { label: "Resolved", cls: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" },
  closed: { label: "Closed", cls: "bg-white/8 text-on-surface-variant border border-white/10" },
  reopened: { label: "Reopened", cls: "bg-red-500/15 text-red-300 border border-red-500/20" },
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  high: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
  medium: <Minus className="w-3.5 h-3.5 text-yellow-400 rotate-90" />,
  low: <Minus className="w-3.5 h-3.5 text-on-surface-variant/40" />,
};

const textareaCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors";

const selectCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors";

// ─── Smart views ─────────────────────────────────────────────────────────────

type SmartView = {
  id: string;
  label: string;
  icon: React.ReactNode;
  statusFilter?: string;
  assignedToMe?: boolean;
  unassigned?: boolean;
  priority?: string;
};

const SMART_VIEWS: SmartView[] = [
  { id: "all", label: "All tickets", icon: <Ticket className="w-3.5 h-3.5" /> },
  { id: "open", label: "Open", icon: <Inbox className="w-3.5 h-3.5" />, statusFilter: "open" },
  { id: "mine", label: "My tickets", icon: <User className="w-3.5 h-3.5" />, assignedToMe: true },
  { id: "unassigned", label: "Unassigned", icon: <Ticket className="w-3.5 h-3.5" />, unassigned: true, statusFilter: "open" },
  { id: "critical", label: "Critical", icon: <AlertOctagon className="w-3.5 h-3.5" />, priority: "critical" },
  { id: "waiting", label: "Waiting", icon: <Clock className="w-3.5 h-3.5" />, statusFilter: "waiting_customer" },
  { id: "resolved", label: "Resolved", icon: <CheckCheck className="w-3.5 h-3.5" />, statusFilter: "resolved" },
];

// ─── Create ticket modal ──────────────────────────────────────────────────────

// ─── Ticket templates ─────────────────────────────────────────────────────────

const TICKET_TEMPLATES: Array<{ label: string; subject: string; message: string; priority: "low" | "medium" | "high" | "critical" }> = [
  {
    label: "Password reset",
    subject: "Password reset request",
    message: "Hi, I need help resetting my password. I've tried the self-service flow but it's not working.",
    priority: "medium",
  },
  {
    label: "Account access",
    subject: "Cannot access my account",
    message: "I'm unable to log in to my account. Could you please help me regain access?",
    priority: "high",
  },
  {
    label: "Bug report",
    subject: "Bug: [Brief description]",
    message: "Steps to reproduce:\n1. \n2. \n\nExpected behavior:\n\nActual behavior:\n\nEnvironment (browser, OS):",
    priority: "high",
  },
  {
    label: "Feature request",
    subject: "Feature request: [Feature name]",
    message: "I'd like to request the following feature:\n\nProblem it solves:\n\nProposed solution:",
    priority: "low",
  },
  {
    label: "Billing inquiry",
    subject: "Billing question",
    message: "I have a question about my recent invoice/charge. Could you please clarify the following:",
    priority: "medium",
  },
];

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [selectedMacroId, setSelectedMacroId] = useState<string | null>(null);

  const { accessToken, tenantId } = useAppStore.getState();
  const macroHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-Tenant-ID": tenantId ?? "",
  };

  const { data: macros = [] } = useQuery({
    queryKey: ["macros"],
    queryFn: async () => {
      const res = await authFetch("/api/macros", { headers: macroHeaders });
      const json = await res.json();
      return (json?.data ?? []) as Array<{ id: string; name: string; description?: string; actions: any[] }>;
    },
  });

  const selectedMacro = macros.find((m) => m.id === selectedMacroId);

  const form = useForm({
    defaultValues: {
      subject: "",
      initialMessage: "",
      priority: "medium" as "low" | "medium" | "high" | "critical",
    },
    validators: { onChange: createTicketSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await api.tickets.index.$post({ json: value });
        if (!res.ok) {
          const body = (await res.json()) as any;
          setError(body?.error?.message || body?.message || "Failed to create ticket");
          return;
        }
        const created = (await res.json()) as any;
        const newTicketId = created?.data?.id ?? created?.id;

        if (selectedMacroId && newTicketId) {
          await authFetch(`/api/macros/${selectedMacroId}/apply`, {
            method: "POST",
            headers: macroHeaders,
            body: JSON.stringify({ ticketId: newTicketId }),
          });
        }

        queryClient.invalidateQueries({ queryKey: ["tickets"] });
        onClose();
      } catch (err: any) {
        setError(err.message || "An error occurred");
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">Create Ticket</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplates((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-on-surface border border-outline-variant px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                Templates
                <ChevronDownIcon className="w-3 h-3" />
              </button>
              {showTemplates && (
                <div className="absolute right-0 mt-1 w-52 bg-surface-container border border-outline-variant rounded-xl shadow-xl z-10 overflow-hidden">
                  {TICKET_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => {
                        form.setFieldValue("subject", tpl.subject);
                        form.setFieldValue("initialMessage", tpl.message);
                        form.setFieldValue("priority", tpl.priority);
                        setShowTemplates(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors border-b border-outline-variant/50 last:border-0"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} aria-label="Close dialog" className="text-on-surface-variant hover:text-on-surface transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
          className="p-5 space-y-4"
        >
          <FormAlert>{error ?? undefined}</FormAlert>

          <form.Field
            name="subject"
            validators={{ onChange: z.string().min(1, "Subject is required") }}
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Subject *</label>
                <Input
                  dense
                  autoFocus
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Brief description of the issue"
                />
                <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
              </div>
            )}
          />

          <form.Field
            name="initialMessage"
            validators={{ onChange: z.string().min(1, "Message is required") }}
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Message *</label>
                <textarea
                  className={textareaCls}
                  rows={5}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Describe the issue in detail..."
                />
                <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
              </div>
            )}
          />

          <form.Field
            name="priority"
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Priority</label>
                <select
                  className={selectCls}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value as "low" | "medium" | "high" | "critical")}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            )}
          />

          {/* Macro picker */}
          <div className="border border-outline-variant rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMacros((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary/70" />
                {selectedMacro ? (
                  <span className="text-on-surface font-medium">{selectedMacro.name}</span>
                ) : (
                  "Apply macro after creation (optional)"
                )}
              </span>
              <ChevronDownIcon className={`w-3 h-3 transition-transform ${showMacros ? "rotate-180" : ""}`} />
            </button>
            {showMacros && (
              <div className="border-t border-outline-variant bg-surface-container-high max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setSelectedMacroId(null); setShowMacros(false); }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-outline-variant/50 ${!selectedMacroId ? "text-primary bg-primary/5" : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"}`}
                >
                  None
                </button>
                {macros.length === 0 && (
                  <p className="px-3 py-2 text-xs text-on-surface-variant/40 italic">No macros defined yet</p>
                )}
                {macros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setSelectedMacroId(m.id); setShowMacros(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors border-b border-outline-variant/50 last:border-0 ${selectedMacroId === m.id ? "text-primary bg-primary/5" : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"}`}
                  >
                    <div className="font-medium text-on-surface">{m.name}</div>
                    {m.description && <div className="text-[10px] text-on-surface-variant/50">{m.description}</div>}
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(m.actions ?? []).slice(0, 4).map((a: any, i: number) => (
                        <span key={i} className="px-1 py-0.5 rounded bg-white/5 text-[10px] text-on-surface-variant/50 border border-white/8">
                          {a.type?.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <form.Subscribe
              selector={(s) => [s.canSubmit, s.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
                  {!isSubmitting && (selectedMacroId ? "Create & Apply Macro" : "Create Ticket")}
                </Button>
              )}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Bulk action toolbar ──────────────────────────────────────────────────────

function BulkToolbar({
  selectedIds,
  onClear,
  onStatusChange,
  isPending,
}: {
  selectedIds: string[];
  onClear: () => void;
  onStatusChange: (status: string) => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
      <span className="text-xs font-semibold text-primary">
        {selectedIds.length} selected
      </span>
      <div className="flex items-center gap-1.5 ml-auto">
        <button
          disabled={isPending}
          onClick={() => onStatusChange("resolved")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
        >
          <CheckCheck className="w-3 h-3" />
          Resolve
        </button>
        <button
          disabled={isPending}
          onClick={() => onStatusChange("closed")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 disabled:opacity-40 transition-colors"
        >
          <XCircle className="w-3 h-3" />
          Close
        </button>
        <button
          disabled={isPending}
          onClick={() => onStatusChange("waiting_customer")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-300 border border-amber-500/20 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
        >
          <Clock className="w-3 h-3" />
          Wait
        </button>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <X className="w-3 h-3" />
          Deselect
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = Math.min(page * pageSize + 1, total);
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
      <span className="text-xs text-on-surface-variant/60">
        {total === 0 ? "0 results" : `${from}–${to} of ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i)
          .filter((i) => Math.abs(i - page) <= 2)
          .map((i) => (
            <button
              key={i}
              onClick={() => onPage(i)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                i === page
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-white/5"
              }`}
            >
              {i + 1}
            </button>
          ))}
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPage(page + 1)}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Tickets list ─────────────────────────────────────────────────────────────

type SortField = "subject" | "status" | "priority" | "createdAt";
type SortDir = "asc" | "desc";

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: SortDir }) {
  if (sortBy !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30 inline ml-1" />;
  return sortDir === "asc"
    ? <ChevronUp className="w-3 h-3 inline ml-1 text-primary" />
    : <ChevronDownIcon className="w-3 h-3 inline ml-1 text-primary" />;
}

function TicketsList() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [activeView, setActiveView] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const queryClient = useQueryClient();

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPage(0);
  };
  const currentUser = useAppStore((s) => s.user);

  const view = SMART_VIEWS.find((v) => v.id === activeView) ?? SMART_VIEWS[0];

  const applyView = (v: SmartView) => {
    setActiveView(v.id);
    setStatusFilter(v.statusFilter ?? "");
    setPage(0);
    setSelected(new Set());
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tickets", page, statusFilter, activeView, sortBy, sortDir],
    queryFn: async () => {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        sortBy,
        sortDir,
      };
      if (view.statusFilter) params.status = view.statusFilter;
      if (statusFilter && !view.statusFilter) params.status = statusFilter;
      if (view.priority) params.priority = view.priority;
      if (view.assignedToMe && currentUser?.id) params.assigneeId = currentUser.id;
      if (view.unassigned) params.unassigned = "true";

      const res = await api.tickets.index.$get({ query: params as any });
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  const raw = (data as any)?.data ?? {};
  const tickets: any[] = Array.isArray(raw) ? raw : raw.data ?? [];
  const total: number = raw.total ?? tickets.length;

  const filtered = search
    ? tickets.filter((t: any) => t.subject.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  const allSelected = filtered.length > 0 && filtered.every((t: any) => selected.has(t.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((t: any) => next.delete(t.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((t: any) => next.add(t.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkMutation = useMutation({
    mutationFn: async (status: string) => {
      await Promise.all(
        Array.from(selected).map((id) =>
          api.tickets[":id"]["status"].$put({ param: { id }, json: { status: status as any } }),
        ),
      );
    },
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  return (
    <>
      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}

      <div className="space-y-4">
        {/* Smart view tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
          {SMART_VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => applyView(v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeView === v.id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-on-surface-variant border border-transparent hover:bg-white/5 hover:text-on-surface"
              }`}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-on-surface">
            {view.label}
          </h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant/40 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search tickets..."
                className="pl-8 pr-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 w-48 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); setSelected(new Set()); }}
              className="px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Bulk toolbar */}
        {selected.size > 0 && (
          <BulkToolbar
            selectedIds={Array.from(selected)}
            onClear={() => setSelected(new Set())}
            onStatusChange={(status) => bulkMutation.mutate(status)}
            isPending={bulkMutation.isPending}
          />
        )}

        {/* Table */}
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <ErrorState
              variant={getErrorVariant(error)}
              message={(error as any)?.message}
              onRetry={refetch}
            />
          ) : (
            <>
              <table className="w-full text-left">
                <thead className="border-b border-outline-variant">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <button onClick={toggleAll} aria-label={allSelected ? "Deselect all tickets" : "Select all tickets"} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                        {allSelected ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-2 py-3 w-6" />
                    <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                      <button onClick={() => toggleSort("subject")} className="inline-flex items-center gap-0.5 hover:text-on-surface transition-colors">
                        Subject <SortIcon field="subject" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                      <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-0.5 hover:text-on-surface transition-colors">
                        Status <SortIcon field="status" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">
                      <button onClick={() => toggleSort("createdAt")} className="inline-flex items-center gap-0.5 hover:text-on-surface transition-colors">
                        Created <SortIcon field="createdAt" sortBy={sortBy} sortDir={sortDir} />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map((ticket: any) => {
                    const isSelected = selected.has(ticket.id);
                    return (
                      <tr
                        key={ticket.id}
                        className={`hover:bg-white/3 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleOne(ticket.id)}
                            className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-3 text-on-surface-variant/40">
                          {PRIORITY_ICON[ticket.priority]}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to="/tickets/$ticketId"
                            params={{ ticketId: ticket.id }}
                            className="text-sm font-medium text-on-surface hover:text-primary transition-colors truncate block max-w-sm"
                          >
                            {ticket.subject}
                          </Link>
                          <span className="text-[11px] font-mono text-on-surface-variant/40">
                            {ticket.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_MAP[ticket.status]?.cls ?? "bg-white/8 text-on-surface-variant"}`}
                          >
                            {STATUS_MAP[ticket.status]?.label ?? ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant/50 hidden md:table-cell font-mono">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && !isLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-primary" />
                          </div>
                          <p className="text-sm font-medium text-on-surface">
                            {search ? "No tickets match your search" : statusFilter ? `No ${STATUS_MAP[statusFilter]?.label.toLowerCase()} tickets` : "No tickets yet"}
                          </p>
                          {!search && !statusFilter && (
                            <button
                              onClick={() => setShowCreate(true)}
                              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                              Create the first ticket
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                onPage={(p) => { setPage(p); setSelected(new Set()); }}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
}
