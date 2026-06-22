import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  ChevronLeft, AlertCircle, AlertTriangle, Minus, Lock, Send, Tag, X, Merge,
  Bold, Italic, List, ListOrdered, Quote, Code, Link2, Undo2, Redo2,
  Mail, Phone, Building2, ExternalLink, ArrowRightLeft, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import type { UpdateTicketStatusInput, UpdatePriorityInput } from "@help-desk/shared";
import { TicketAttachments } from "@/features/tickets/TicketAttachments";
import { SlaCountdown } from "@/components/SlaCountdown";
import { TicketTimeline } from "@/features/tickets/TicketTimeline";
import { FormAlert, FormError } from "@/components/ui";

export const Route = createFileRoute("/_auth/tickets/$ticketId")({
  component: TicketDetail,
});

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  assigned: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  in_progress: "bg-primary/15 text-primary border border-primary/20",
  waiting_customer: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  resolved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  closed: "bg-white/8 text-on-surface-variant border border-white/10",
  reopened: "bg-red-500/15 text-red-300 border border-red-500/20",
  archived: "bg-gray-500/15 text-gray-400 border border-gray-500/30",
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  critical: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
  high: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
  medium: <Minus className="w-3.5 h-3.5 text-yellow-400" />,
  low: <Minus className="w-3.5 h-3.5 text-on-surface-variant/40" />,
};

const TICKET_STATUSES = [
  "open", "assigned", "in_progress", "waiting_customer", "resolved", "closed", "reopened", "archived"
] as const;

const TICKET_PRIORITIES = ["low", "medium", "high", "critical"] as const;

const selectCls =
  "w-full px-2.5 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

// ─── Requester/contact panel ──────────────────────────────────────────────────

function RequesterPanel({ ticket }: { ticket: any }) {
  const { t } = useTranslation("tickets");
  const contact = ticket.contact;
  const requester = contact ?? ticket.requester;
  if (!requester) return null;

  const name = [requester.firstName, requester.lastName].filter(Boolean).join(" ") || "Unknown";
  const initials = `${requester.firstName?.[0] ?? ""}${requester.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("detail.requester")}</h3>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-on-surface truncate">{name}</p>
          {requester.email && (
            <p className="text-xs text-on-surface-variant/60 truncate">{requester.email}</p>
          )}
        </div>
      </div>
      <div className="space-y-1.5 pt-1">
        {requester.email && (
          <a
            href={`mailto:${requester.email}`}
            className="flex items-center gap-2 text-xs text-on-surface-variant/70 hover:text-primary transition-colors group"
          >
            <Mail className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{requester.email}</span>
          </a>
        )}
        {requester.phone && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{requester.phone}</span>
          </div>
        )}
        {(requester.company || requester.organization) && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant/70">
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{requester.company ?? requester.organization}</span>
          </div>
        )}
      </div>
      {requester.id && (
        <a
          href={`/users/${requester.id}`}
          className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors pt-1"
        >
          <ExternalLink className="w-3 h-3" />
          {t("detail.viewContactProfile")}
        </a>
      )}
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function TicketProperties({ ticket, ticketId }: { ticket: any; ticketId: string }) {
  const { t } = useTranslation("tickets");
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: async (status: UpdateTicketStatusInput["status"]) => {
      const res = await api.tickets[":id"].status.$put({
        param: { id: ticketId },
        json: { status },
      });
      if (!res.ok) throw new Error(t("errors.failedStatus"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const priorityMutation = useMutation({
    mutationFn: async (priority: UpdatePriorityInput["priority"]) => {
      const res = await api.tickets[":id"].priority.$put({
        param: { id: ticketId },
        json: { priority },
      });
      if (!res.ok) throw new Error(t("errors.failedPriority"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: deptsData } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.departments.index.$get();
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const users: any[] = (usersData as any)?.data ?? [];
  const departments: any[] = (deptsData as any)?.data ?? [];

  const transferMutation = useMutation({
    mutationFn: async (departmentId: string) => {
      const res = await api.tickets[":id"].$patch({
        param: { id: ticketId },
        json: { departmentId },
      });
      if (!res.ok) throw new Error(t("errors.transferFailed"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string) => {
      const res = await api.tickets[":id"].assign.$put({
        param: { id: ticketId },
        json: { assigneeId },
      });
      if (!res.ok) throw new Error(t("errors.failedAssign"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  const anyPending =
    statusMutation.isPending || priorityMutation.isPending || assignMutation.isPending || transferMutation.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-4">
        <h3 className="text-xs font-semibold text-on-surface">{t("detail.properties")}</h3>

        {/* Status */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.status")}
          </label>
          <select
            className={selectCls}
            value={ticket.status}
            disabled={statusMutation.isPending}
            onChange={(e) =>
              statusMutation.mutate(e.target.value as UpdateTicketStatusInput["status"])
            }
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.priority")}
          </label>
          <select
            className={selectCls}
            value={ticket.priority}
            disabled={priorityMutation.isPending}
            onChange={(e) =>
              priorityMutation.mutate(e.target.value as UpdatePriorityInput["priority"])
            }
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {t(`priorities.${p}`)}
              </option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.assignee")}
          </label>
          <select
            className={selectCls}
            value={ticket.assigneeId ?? ""}
            disabled={assignMutation.isPending || users.length === 0}
            onChange={(e) => {
              if (e.target.value) assignMutation.mutate(e.target.value);
            }}
          >
            <option value="">{t("detail.unassigned")}</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>

        {/* Department / Transfer */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.department")}
          </label>
          <select
            className={selectCls}
            value={ticket.departmentId ?? ""}
            disabled={transferMutation.isPending || departments.length === 0}
            onChange={(e) => e.target.value && transferMutation.mutate(e.target.value)}
          >
            <option value="">{t("detail.noDepartment")}</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* SLA */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.sla")}
          </p>
          <SlaCountdown
            targetAt={ticket.firstResponseTargetAt ?? null}
            met={ticket.firstResponseMet ?? null}
            label={t("detail.slaFirstResponse")}
            ticketStatus={ticket.status}
          />
        </div>

        {/* Created */}
        <div className="space-y-1 pt-2 border-t border-outline-variant">
          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
            {t("fields.createdAt")}
          </p>
          <p className="text-xs font-mono text-on-surface-variant/50">
            {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {anyPending && (
        <p className="text-xs text-on-surface-variant/50 text-center">{t("detail.saving")}</p>
      )}

      <FormError>
        {(statusMutation.error || priorityMutation.error || assignMutation.error)
          ? ((statusMutation.error || priorityMutation.error || assignMutation.error) as Error)?.message
          : undefined}
      </FormError>
    </div>
  );
}

// ─── Tags panel ───────────────────────────────────────────────────────────────

function TicketTags({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation("tickets");
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { data: tagsData } = useQuery({
    queryKey: ["ticket-tags", ticketId],
    queryFn: async () => {
      const res = await api.tickets[":id"].tags.$get({ param: { id: ticketId } });
      if (!res.ok) return [];
      const json = await res.json() as any;
      return (json?.data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const tags: Array<{ id: string; name: string }> = tagsData ?? [];

  const addTag = useMutation({
    mutationFn: async (tag: string) => {
      const res = await api.tickets[":id"].tags.$post({
        param: { id: ticketId },
        json: { name: tag },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setInput("");
      queryClient.invalidateQueries({ queryKey: ["ticket-tags", ticketId] });
    },
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await api.tickets[":id"].tags[":tagId"].$delete({
        param: { id: ticketId, tagId },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket-tags", ticketId] }),
  });

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-on-surface-variant" />
        {t("tags.title")}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium border border-primary/20"
          >
            {tag.name}
            <button
              onClick={() => removeTag.mutate(tag.id)}
              className="text-primary/60 hover:text-error transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <p className="text-[11px] text-on-surface-variant/40">{t("tags.noTags")}</p>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              addTag.mutate(input.trim());
              e.preventDefault();
            }
          }}
          placeholder={t("tags.addPlaceholder")}
          className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
        <button
          onClick={() => input.trim() && addTag.mutate(input.trim())}
          disabled={!input.trim() || addTag.isPending}
          className="px-2.5 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {t("tags.add")}
        </button>
      </div>
    </div>
  );
}

// ─── Merge panel ──────────────────────────────────────────────────────────────

function TicketMerge({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation("tickets");
  const queryClient = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const [open, setOpen] = useState(false);

  const mergeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.tickets[":id"].merge.$post({
        param: { id: ticketId },
        json: { targetTicketId: targetId.trim() },
      });
      if (!res.ok) throw new Error(t("merge.failed"));
    },
    onSuccess: () => {
      setOpen(false);
      setTargetId("");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
      >
        <Merge className="w-3.5 h-3.5" />
        {t("merge.button")}
      </button>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
          <Merge className="w-3.5 h-3.5" />
          {t("merge.title")}
        </h3>
        <button onClick={() => setOpen(false)} className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-on-surface-variant/60">
        {t("merge.description")}
      </p>
      <input
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
        placeholder={t("merge.placeholder")}
        className="w-full px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
      {mergeMutation.error && (
        <p className="text-[11px] text-error">{(mergeMutation.error as Error).message}</p>
      )}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 py-1.5 text-xs border border-outline-variant text-on-surface-variant rounded-lg hover:bg-white/5 transition-colors">
          {t("merge.cancel")}
        </button>
        <button
          onClick={() => mergeMutation.mutate()}
          disabled={!targetId.trim() || mergeMutation.isPending}
          className="flex-1 py-1.5 text-xs bg-error text-white rounded-lg hover:bg-error/90 disabled:opacity-40 transition-colors font-medium"
        >
          {mergeMutation.isPending ? t("merge.merging") : t("merge.merge")}
        </button>
      </div>
    </div>
  );
}

// ─── Apply Macro ──────────────────────────────────────────────────────────────

function ApplyMacro({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation("tickets");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const { data: macros = [] } = useQuery({
    queryKey: ["macros"],
    queryFn: async () => {
      const res = await api.macros.index.$get();
      const json = await res.json() as any;
      return (json?.data ?? []) as Array<{ id: string; name: string; description?: string; actions: any[] }>;
    },
    enabled: open,
  });

  const applyMutation = useMutation({
    mutationFn: async (macroId: string) => {
      const res = await api.macros[":id"].apply.$post({
        param: { id: macroId },
        json: { ticketId },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data: any) => {
      const count = data?.data?.applied ?? 0;
      setResult(t("macro.applied", { count }));
      qc.invalidateQueries({ queryKey: ["ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["ticket-tags", ticketId] });
      setTimeout(() => { setOpen(false); setSelected(""); setResult(null); }, 1500);
    },
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
      >
        <Zap className="w-3.5 h-3.5 text-primary/70" />
        {t("macro.button")}
      </button>
    );
  }

  const selectedMacro = macros.find((m) => m.id === selected);

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-primary" />
          {t("macro.title")}
        </h3>
        <button onClick={() => { setOpen(false); setSelected(""); setResult(null); }} className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {macros.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant/40 italic">{t("macro.noMacros")}</p>
      ) : (
        <div className="space-y-2">
          {macros.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors ${selected === m.id ? "border-primary/40 bg-primary/10 text-on-surface" : "border-outline-variant bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:border-outline"}`}
            >
              <div className="font-medium">{m.name}</div>
              {m.description && <div className="text-[10px] text-on-surface-variant/50 mt-0.5">{m.description}</div>}
              <div className="flex flex-wrap gap-1 mt-1">
                {(m.actions ?? []).slice(0, 3).map((a: any, i: number) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-on-surface-variant/60 border border-white/8">
                    {a.type?.replace(/_/g, " ")}
                    {a.value ? `: ${String(a.value).slice(0, 15)}` : ""}
                  </span>
                ))}
                {m.actions?.length > 3 && <span className="text-[10px] text-on-surface-variant/40">+{m.actions.length - 3} more</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {result && (
        <p className="text-[11px] text-emerald-400 font-medium">{result}</p>
      )}
      {applyMutation.error && (
        <p className="text-[11px] text-error">{(applyMutation.error as Error).message}</p>
      )}

      <div className="flex gap-2">
        <button onClick={() => { setOpen(false); setSelected(""); setResult(null); }} className="flex-1 py-1.5 text-xs border border-outline-variant text-on-surface-variant rounded-lg hover:bg-white/5 transition-colors">
          {t("macro.cancel")}
        </button>
        <button
          onClick={() => selected && applyMutation.mutate(selected)}
          disabled={!selected || applyMutation.isPending}
          className="flex-1 py-1.5 text-xs bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors font-medium flex items-center justify-center gap-1"
        >
          <Zap className="w-3 h-3" />
          {applyMutation.isPending ? t("macro.applying") : t("macro.apply")}
        </button>
      </div>
    </div>
  );
}

// ─── SLA timeline ─────────────────────────────────────────────────────────────

function SlaTimeline({ ticket }: { ticket: any }) {
  const { t } = useTranslation("tickets");
  const sla = ticket.slaPolicy ?? ticket.sla;
  if (!sla && !ticket.firstResponseDueAt && !ticket.resolutionDueAt) return null;

  const now = Date.now();

  const milestones = [
    {
      label: t("slaTimeline.created"),
      at: ticket.createdAt,
      done: true,
    },
    {
      label: t("slaTimeline.firstResponse"),
      at: ticket.firstResponseAt ?? ticket.firstResponseDueAt,
      due: ticket.firstResponseDueAt,
      done: !!ticket.firstResponseAt,
    },
    {
      label: t("slaTimeline.resolution"),
      at: ticket.resolvedAt ?? ticket.resolutionDueAt,
      due: ticket.resolutionDueAt,
      done: !!ticket.resolvedAt,
    },
  ].filter((m) => m.at);

  if (milestones.length < 2) return null;

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <h3 className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("slaTimeline.title")}</h3>
      <div className="space-y-2">
        {milestones.map((m, i) => {
          const d = m.at ? new Date(m.at) : null;
          const isOverdue = m.due && !m.done && new Date(m.due).getTime() < now;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.done ? "bg-emerald-500" : isOverdue ? "bg-error" : "bg-primary/40"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${m.done ? "text-on-surface" : isOverdue ? "text-error" : "text-on-surface-variant"}`}>
                    {m.label}
                  </p>
                  {d && (
                    <span className="text-[10px] font-mono text-on-surface-variant/40 shrink-0">
                      {d.toLocaleDateString()} {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                {isOverdue && (
                  <p className="text-[10px] text-error/70 mt-0.5">{t("slaTimeline.overdue")}</p>
                )}
                {!m.done && m.due && !isOverdue && (
                  <p className="text-[10px] text-on-surface-variant/40 mt-0.5">
                    {t("slaTimeline.due", { date: new Date(m.due).toLocaleDateString() })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── CC / Followers ───────────────────────────────────────────────────────────

function CcFollowers({ ticket, ticketId }: { ticket: any; ticketId: string }) {
  const { t } = useTranslation("tickets");
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const queryClient = useQueryClient();

  const ccs: string[] = ticket.ccEmails ?? ticket.cc ?? [];

  const addMutation = useMutation({
    mutationFn: async (ccEmail: string) => {
      const res = await api.tickets[":id"].cc.$post({
        param: { id: ticketId },
        json: { email: ccEmail },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }); setEmail(""); setAdding(false); },
  });

  const removeMutation = useMutation({
    mutationFn: async (ccEmail: string) => {
      const res = await api.tickets[":id"].cc[":email"].$delete({
        param: { id: ticketId, email: ccEmail },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }),
  });

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("cc.title")}</h3>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-[10px] text-primary hover:text-primary/80 transition-colors"
        >
          {t("cc.add")}
        </button>
      </div>
      {adding && (
        <div className="flex gap-1.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@domain.com"
            className="flex-1 min-w-0 px-2.5 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
            onKeyDown={(e) => { if (e.key === "Enter" && email) addMutation.mutate(email); }}
          />
          <button
            onClick={() => { if (email) addMutation.mutate(email); }}
            disabled={!email || addMutation.isPending}
            className="px-2.5 py-1 text-xs bg-primary text-on-primary rounded-lg disabled:opacity-40"
          >
            {t("cc.add")}
          </button>
        </div>
      )}
      {ccs.length === 0 ? (
        <p className="text-xs text-on-surface-variant/30">{t("cc.noFollowers")}</p>
      ) : (
        <div className="space-y-1">
          {ccs.map((cc: string) => (
            <div key={cc} className="flex items-center justify-between gap-2">
              <span className="text-xs text-on-surface-variant/70 truncate">{cc}</span>
              <button
                onClick={() => removeMutation.mutate(cc)}
                disabled={removeMutation.isPending}
                className="shrink-0 p-0.5 text-on-surface-variant/30 hover:text-error transition-colors"
                aria-label={`Remove ${cc}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Rich text editor ─────────────────────────────────────────────────────────

interface RichTextEditorProps {
  placeholder?: string;
  onChange: (html: string) => void;
  className?: string;
}

function RichTextEditor({ placeholder, onChange, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const exec = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText.trim();
    setIsEmpty(text === "");
    onChange(text === "" ? "" : el.innerHTML);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      exec("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;");
    }
    // Ctrl+B/I/U shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); exec("bold"); }
      if (e.key === "i") { e.preventDefault(); exec("italic"); }
      if (e.key === "u") { e.preventDefault(); exec("underline"); }
    }
  }, [exec]);

  const insertLink = useCallback(() => {
    const url = window.prompt("Enter URL:");
    if (url) exec("createLink", url);
  }, [exec]);

  const toolBtn = "p-1.5 rounded hover:bg-white/10 text-on-surface-variant/60 hover:text-on-surface transition-colors disabled:opacity-30";

  return (
    <div className={`border border-outline-variant rounded-lg overflow-hidden bg-surface-container-high focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/60 transition-colors ${className ?? ""}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-outline-variant/50 flex-wrap">
        <button type="button" onClick={() => exec("bold")} className={toolBtn} title="Bold (Ctrl+B)">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("italic")} className={toolBtn} title="Italic (Ctrl+I)">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} className={toolBtn} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} className={toolBtn} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "blockquote")} className={toolBtn} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("formatBlock", "pre")} className={toolBtn} title="Code block">
          <Code className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={insertLink} className={toolBtn} title="Insert link">
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-outline-variant/50 mx-1" />
        <button type="button" onClick={() => exec("undo")} className={toolBtn} title="Undo">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => exec("redo")} className={toolBtn} title="Redo">
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <span className="absolute top-2.5 left-3 text-sm text-on-surface-variant/35 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] max-h-[240px] overflow-y-auto px-3 py-2.5 text-sm text-on-surface outline-none prose prose-invert prose-sm max-w-none [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-3 [&_blockquote]:text-on-surface-variant [&_pre]:bg-white/5 [&_pre]:rounded [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4"
          aria-label={placeholder}
          role="textbox"
          aria-multiline="true"
        />
      </div>
    </div>
  );
}

// ─── Convert ticket → task ────────────────────────────────────────────────────

// Ticket priorities are lowercase (low/medium/high/critical); task priorities
// are uppercase with URGENT instead of critical. Map across the two domains.
const TICKET_TO_TASK_PRIORITY: Record<string, string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  critical: "URGENT",
};

function ConvertToTaskButton({ ticket, ticketId }: { ticket: any; ticketId: string }) {
  const { t } = useTranslation("tickets");
  const [open, setOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const convert = async () => {
    setConverting(true);
    setError(null);
    try {
      const res = await api.tasks.index.$post({
        json: {
          title: ticket.subject,
          description: `Converted from ticket #${ticketId}`,
          priority: (TICKET_TO_TASK_PRIORITY[String(ticket.priority ?? "").toLowerCase()] ?? "MEDIUM") as any,
        },
      });
      if (res.ok) {
        // Carry the ticket's assignee over to the new task. Assignment is a
        // separate endpoint — createTaskSchema doesn't accept assigneeId.
        const b = (await res.json().catch(() => ({}))) as any;
        const newTaskId = b?.data?.id;
        if (newTaskId && ticket.assigneeId) {
          await api.tasks[":id"].assign.$put({
            param: { id: newTaskId },
            json: { assigneeId: ticket.assigneeId },
          });
        }
        setDone(true);
        setOpen(false);
      } else {
        const b = (await res.json().catch(() => ({}))) as any;
        setError(b?.error?.message || b?.message || t("convert.failed"));
      }
    } catch (e: any) {
      setError(e?.message || t("convert.failed"));
    } finally {
      setConverting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant/50 border border-outline-variant px-2 py-1 rounded-lg hover:bg-white/5 hover:text-on-surface-variant transition-colors"
        title={t("convert.tooltip")}
      >
        <ArrowRightLeft className="w-3 h-3" />
        {done ? t("convert.converted") : t("convert.button")}
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-on-surface">{t("convert.title")}</h3>
            <p className="text-xs text-on-surface-variant/70">
              {t("convert.description", { subject: ticket.subject })}
            </p>
            <FormAlert>{error ?? undefined}</FormAlert>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-xs text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 transition-colors">{t("convert.cancel")}</button>
              <button
                onClick={convert}
                disabled={converting}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {converting ? t("convert.converting") : t("convert.convert")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Ticket detail ────────────────────────────────────────────────────────────

function TicketDetail() {
  const { t } = useTranslation("tickets");
  const { ticketId } = Route.useParams();
  const queryClient = useQueryClient();
  const user = useAppStore((state) => state.user);
  const [reply, setReply] = useState("");
  const [replyType, setReplyType] = useState<"PUBLIC_REPLY" | "INTERNAL_NOTE">(
    "PUBLIC_REPLY",
  );

  const { data: ticketData, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => {
      const res = await api.tickets[":id"].$get({ param: { id: ticketId } });
      if (!res.ok) throw new Error(t("errors.failedToFetch"));
      return res.json();
    },
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const res = await api.tickets[":id"]["messages"].$get({
        param: { id: ticketId },
      });
      if (!res.ok) throw new Error(t("errors.failedMessages"));
      return res.json();
    },
  });

  const [replyKey, setReplyKey] = useState(0); // increment to reset editor

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await api.tickets[":id"]["messages"].$post({
        param: { id: ticketId },
        json: { content: reply, type: replyType },
      });
      if (!res.ok) throw new Error(t("errors.failedSend"));
      return res.json();
    },
    onSuccess: () => {
      setReply("");
      setReplyKey((k) => k + 1); // unmount/remount editor to clear it
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
    },
  });

  if (ticketLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-[60vh] bg-surface-container border border-outline-variant rounded-xl animate-pulse" />
      </div>
    );
  }

  const ticket = (ticketData as any)?.data;
  const messages = (messagesData as any)?.data ?? [];

  if (!ticket) {
    return (
      <div className="p-8 text-center text-on-surface-variant/40 text-sm">
        {t("detail.notFound")}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-6rem)] space-y-4">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div className="flex-1 min-w-0">
          <Link
            to="/tickets"
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 hover:text-on-surface-variant mb-2 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            {t("detail.backToTickets")}
          </Link>
          <h1 className="text-base font-semibold text-on-surface truncate leading-snug">
            {ticket.subject}
          </h1>
          <p className="text-[11px] font-mono text-on-surface-variant/40 mt-0.5">
            {ticket.id}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {PRIORITY_ICON[ticket.priority]}
          <span
            className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${STATUS_CLS[ticket.status] ?? "bg-white/8 text-on-surface-variant"}`}
          >
            {t(`statuses.${ticket.status}`, { defaultValue: ticket.status })}
          </span>
          {ticket.status !== "archived" && (
            <button
              onClick={() => {
                api.tickets[":id"].status.$put({
                  param: { id: ticketId },
                  json: { status: "archived" }
                }).then(() => queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] }));
              }}
              className="inline-flex items-center gap-1 text-[10px] font-medium text-on-surface-variant/70 border border-outline-variant px-2 py-1 rounded-lg hover:bg-white/5 hover:text-on-surface transition-colors"
              title="Archive ticket"
            >
              Archive
            </button>
          )}
          <ConvertToTaskButton ticket={ticket} ticketId={ticketId} />
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Message thread */}
        <div className="flex-1 flex flex-col bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto pretty-scroll p-4 space-y-4">
            {messagesLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 bg-white/5 rounded animate-pulse" />
                      <div className="h-16 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-on-surface-variant/40 text-sm py-12">
                {t("detail.noMessages")}
              </div>
            ) : (
              messages.map((msg: any) => (
                <div key={msg.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] font-bold text-primary shrink-0 uppercase">
                    {msg.senderId === user?.id
                      ? `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`
                      : msg.senderName && msg.senderName.trim() !== ""
                        ? `${msg.senderName.trim().split(' ')[0]?.[0] || ""}${msg.senderName.trim().split(' ')[1]?.[0] || ""}`
                        : msg.contactName && msg.contactName.trim() !== ""
                          ? `${msg.contactName.trim().split(' ')[0]?.[0] || ""}`
                          : msg.contactEmail
                            ? `${msg.contactEmail[0]}`
                            : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-on-surface">
                        {msg.senderId === user?.id
                          ? `${user?.firstName} ${user?.lastName}`
                          : msg.senderName && msg.senderName.trim() !== ""
                            ? msg.senderName.trim()
                            : msg.contactName && msg.contactName.trim() !== ""
                              ? msg.contactName.trim()
                              : msg.contactEmail
                                ? msg.contactEmail
                                : t("detail.agent")}
                      </span>
                      {msg.type === "INTERNAL_NOTE" && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                          <Lock className="w-2.5 h-2.5" />
                          {t("detail.internalBadge")}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-on-surface-variant/40">
                        {new Date(msg.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className={`text-sm text-on-surface-variant leading-relaxed p-3 rounded-lg border ${
                        msg.type === "INTERNAL_NOTE"
                          ? "bg-amber-500/5 border-amber-500/15"
                          : "bg-white/3 border-white/8"
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(msg.content ?? ""),
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply box */}
          <div className="p-3 border-t border-outline-variant bg-surface-container-low shrink-0">
            <div className="flex gap-1.5 mb-2">
              <button
                onClick={() => setReplyType("PUBLIC_REPLY")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  replyType === "PUBLIC_REPLY"
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant border border-outline-variant hover:bg-white/5"
                }`}
              >
                {t("detail.reply")}
              </button>
              <button
                onClick={() => setReplyType("INTERNAL_NOTE")}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  replyType === "INTERNAL_NOTE"
                    ? "bg-amber-600 text-white"
                    : "text-on-surface-variant border border-outline-variant hover:bg-white/5"
                }`}
              >
                {t("detail.internalNote")}
              </button>
            </div>
            <RichTextEditor
              key={replyKey}
              placeholder={replyType === "PUBLIC_REPLY" ? t("detail.replyPlaceholder") : t("detail.notePlaceholder")}
              onChange={setReply}
              className={replyType === "INTERNAL_NOTE" ? "border-amber-500/30" : ""}
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => replyMutation.mutate()}
                disabled={!reply.trim() || replyMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {replyMutation.isPending
                  ? t("detail.sending")
                  : replyType === "PUBLIC_REPLY"
                    ? t("detail.sendReply")
                    : t("detail.addNote")}
              </button>
            </div>
          </div>
        </div>

        {/* Properties right-bar */}
        <aside className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto pretty-scroll pl-4 pr-1 border-l border-outline-variant">
          <RequesterPanel ticket={ticket} />
          <TicketProperties ticket={ticket} ticketId={ticketId} />
          <SlaTimeline ticket={ticket} />
          <CcFollowers ticket={ticket} ticketId={ticketId} />
          <TicketTags ticketId={ticketId} />
          <TicketAttachments ticketId={ticketId} />
          <TicketTimeline ticketId={ticketId} />
          <ApplyMacro ticketId={ticketId} />
          <TicketMerge ticketId={ticketId} />
        </aside>
      </div>
    </div>
  );
}
