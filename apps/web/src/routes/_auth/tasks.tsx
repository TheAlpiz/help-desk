import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import {
  Plus, X, AlertCircle, AlertTriangle, Minus, ListChecks, MessageSquare, Send,
  CheckSquare, Square, LayoutList, Kanban, Trash2, ChevronDown, Clock, CalendarDays, BarChartHorizontal
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { EntityAttachments } from "@/features/tickets/TicketAttachments";
import { createTaskSchema, updateTaskStatusSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";
import { TaskCalendar } from "@/features/tasks/TaskCalendar";
import { TaskGantt } from "@/features/tasks/TaskGantt";

export const Route = createFileRoute("/_auth/tasks")({
  component: TasksList,
});

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  assigneeId?: string | null;
};

const PRIORITY_CONFIG: Record<string, { icon: React.ReactNode; cls: string }> = {
  URGENT: {
    icon: <AlertCircle className="w-3 h-3 text-red-400" />,
    cls: "bg-red-500/15 text-red-300 border border-red-500/20",
  },
  HIGH: {
    icon: <AlertTriangle className="w-3 h-3 text-orange-400" />,
    cls: "bg-orange-500/15 text-orange-300 border border-orange-500/20",
  },
  MEDIUM: {
    icon: <Minus className="w-3 h-3 text-yellow-400" />,
    cls: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20",
  },
  LOW: {
    icon: <Minus className="w-3 h-3 text-on-surface-variant/40" />,
    cls: "bg-white/8 text-on-surface-variant border border-white/10",
  },
};

const COLUMNS = [
  { key: "TODO", labelKey: "columns.todo", accent: "text-on-surface-variant" },
  { key: "IN_PROGRESS", labelKey: "columns.in_progress", accent: "text-primary" },
  { key: "BLOCKED", labelKey: "columns.blocked", accent: "text-red-400" },
  { key: "REVIEW", labelKey: "columns.review", accent: "text-amber-400" },
  { key: "DONE", labelKey: "columns.done", accent: "text-emerald-400" },
];

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE", "CANCELED"] as const;

const textareaCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors";

const DONE_STATUSES = new Set(["DONE", "CANCELED"]);

function DueDateBadge({ dueDate, status }: { dueDate?: string | null; status: string }) {
  const { t } = useTranslation("tasks");

  if (!dueDate) return null;
  if (DONE_STATUSES.has(status)) return null;

  const due = new Date(dueDate);
  const now = Date.now();
  const diffMs = due.getTime() - now;
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const overdue = diffMs < 0;

  const fmt = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h`;
    return `${Math.floor(mins / 1440)}d`;
  };

  const label = overdue
    ? t("dueDate.overdue", { time: fmt(diffMins) })
    : t("dueDate.dueIn", { time: fmt(diffMins) });

  const cls = overdue
    ? "bg-red-500/15 text-red-300 border-red-500/20"
    : diffMs < 2 * 60 * 60 * 1000
      ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
      : "bg-white/6 text-on-surface-variant/60 border-white/10";

  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      <Clock className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

const selectCls =
  "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60 transition-colors";

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Task templates ───────────────────────────────────────────────────────────

const TASK_TEMPLATES: Array<{ label: string; title: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }> = [
  { label: "Bug fix", title: "Fix: [describe bug]", description: "Steps to reproduce:\n1. \n\nExpected:\nActual:\n\nFix approach:", priority: "HIGH" },
  { label: "Code review", title: "Review: [PR/branch name]", description: "Review checklist:\n- [ ] Logic correct\n- [ ] Tests pass\n- [ ] No security issues\n- [ ] Docs updated", priority: "MEDIUM" },
  { label: "Deploy", title: "Deploy [service] to [env]", description: "Pre-deploy:\n- [ ] Tests green\n- [ ] Migration ready\n- [ ] Rollback plan documented\n\nPost-deploy:\n- [ ] Smoke test\n- [ ] Monitor for 30 min", priority: "HIGH" },
  { label: "Documentation", title: "Document [feature/API]", description: "Scope:\n\nAudience:\n\nSections to cover:", priority: "LOW" },
  { label: "Investigation", title: "Investigate: [issue]", description: "Symptom:\n\nHypotheses:\n1. \n2. \n\nReproduction steps:", priority: "MEDIUM" },
  { label: "Onboarding", title: "Onboard [name] — [role]", description: "Week 1:\n- [ ] Account setup\n- [ ] Intro meetings\n- [ ] Environment setup\n\nWeek 2:\n- [ ] First task\n- [ ] Process walkthrough", priority: "LOW" },
];

// ─── Create task modal ────────────────────────────────────────────────────────

function CreateTaskModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("tasks");
  const { t: tCommon } = useTranslation("common");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      dueDate: "",
    },
    validators: {
      // dueDate is relaxed to a plain optional string here: the
      // <input type="date"> emits "YYYY-MM-DD" (and "" when empty), neither of
      // which passes createTaskSchema's .datetime() check — that would wedge
      // canSubmit to false forever. It's converted to ISO in onSubmit and
      // re-validated server-side against the real datetime schema.
      onChange: createTaskSchema
        .omit({ ticketId: true, parentTaskId: true })
        .extend({ dueDate: z.string().optional() }) as any,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          title: value.title,
          priority: value.priority,
        };
        if (value.description) payload.description = value.description;
        if (value.dueDate) payload.dueDate = new Date(value.dueDate).toISOString();

        const res = await api.tasks.index.$post({ json: payload as any });
        if (!res.ok) {
          const body = (await res.json()) as any;
          setError(body?.error?.message || body?.message || tCommon("errors.saveFailed"));
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        onClose();
      } catch (err: any) {
        setError(err.message || tCommon("errors.generic"));
      }
    },
  });

  return (
    <ModalShell title={t("create")} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="p-5 space-y-4"
      >
        {/* Template picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setTemplateOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-on-surface border border-outline-variant px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            Use template
            <ChevronDown className="w-3 h-3" />
          </button>
          {templateOpen && (
            <div className="absolute left-0 mt-1 w-56 bg-surface-container border border-outline-variant rounded-xl shadow-xl z-10 overflow-hidden">
              {TASK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => {
                    form.setFieldValue("title", tpl.title);
                    form.setFieldValue("description", tpl.description);
                    form.setFieldValue("priority", tpl.priority);
                    setTemplateOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors border-b border-outline-variant/50 last:border-0"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field
          name="title"
          validators={{ onChange: z.string().min(1, tCommon("errors.requiredField")) }}
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("fields.title")} *</label>
              <Input
                dense
                autoFocus
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="What needs to be done?"
              />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )}
        />

        <form.Field
          name="description"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("fields.description")}</label>
              <textarea
                className={textareaCls}
                rows={3}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Optional details..."
              />
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="priority"
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">{t("fields.priority")}</label>
                <select
                  className={selectCls}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) =>
                    field.handleChange(
                      e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
                    )
                  }
                >
                  <option value="LOW">{tCommon("priority.low")}</option>
                  <option value="MEDIUM">{tCommon("priority.medium")}</option>
                  <option value="HIGH">{tCommon("priority.high")}</option>
                  <option value="URGENT">{tCommon("priority.urgent")}</option>
                </select>
              </div>
            )}
          />
          <form.Field
            name="dueDate"
            children={(field) => (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">{t("fields.dueDate")}</label>
                <Input
                  dense
                  type="date"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{tCommon("actions.cancel")}</Button>
          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
                {!isSubmitting && t("create")}
              </Button>
            )}
          />
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Update status modal ──────────────────────────────────────────────────────

function UpdateStatusModal({
  task,
  onClose,
}: {
  task: Task;
  onClose: () => void;
}) {
  const { t } = useTranslation("tasks");
  const { t: tCommon } = useTranslation("common");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      status: task.status as (typeof TASK_STATUSES)[number],
    },
    validators: { onChange: updateTaskStatusSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await api.tasks[":id"].status.$put({
          param: { id: task.id },
          json: value,
        });
        if (!res.ok) {
          const body = (await res.json()) as any;
          setError(body?.error?.message || body?.message || tCommon("errors.saveFailed"));
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        onClose();
      } catch (err: any) {
        setError(err.message || tCommon("errors.generic"));
      }
    },
  });

  return (
    <ModalShell title={task.title} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="p-5 space-y-4"
      >
        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field
          name="status"
          children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("actions.updateStatus")}</label>
              <select
                className={selectCls}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) =>
                  field.handleChange(e.target.value as (typeof TASK_STATUSES)[number])
                }
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          )}
        />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{tCommon("actions.cancel")}</Button>
          <form.Subscribe
            selector={(s) => [s.canSubmit, s.isSubmitting]}
            children={([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
                {!isSubmitting && tCommon("actions.save")}
              </Button>
            )}
          />
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Kanban board ─────────────────────────────────────────────────────────────

// ─── Task detail drawer ───────────────────────────────────────────────────────

function TaskDetailDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const { t } = useTranslation("tasks");
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: detailData } = useQuery({
    queryKey: ["task", task.id],
    queryFn: async () => {
      const res = await api.tasks[":id"].$get({ param: { id: task.id } });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const detail = (detailData as any)?.data ?? task;

  // Comments live behind a dedicated endpoint — findById does not embed them.
  const { data: commentsData } = useQuery({
    queryKey: ["task-comments", task.id],
    queryFn: async () => {
      const res = await api.tasks[":id"].comments.$get({ param: { id: task.id } });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.tasks[":id"].status.$put({
        param: { id: task.id },
        json: { status: status as any },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });
  const users: any[] = (usersData as any)?.data ?? [];

  const assignMutation = useMutation({
    mutationFn: async (assigneeId: string) => {
      const res = await api.tasks[":id"].assign.$put({
        param: { id: task.id },
        json: { assigneeId },
      });
      if (!res.ok) throw new Error("Failed to assign task");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const res = await api.tasks[":id"].comments.$post({
        param: { id: task.id },
        json: { content: comment },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", task.id] });
    },
  });

  const comments: any[] = (commentsData as any)?.data ?? [];
  const prio = PRIORITY_CONFIG[task.priority];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-on-surface leading-snug">{task.title}</p>
            {task.dueDate && (
              <div className="mt-1">
                <DueDateBadge dueDate={task.dueDate} status={task.status} />
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Status + priority */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${prio?.cls ?? "bg-white/8 text-on-surface-variant"}`}>
              {prio?.icon} {task.priority}
            </span>
            <select
              value={detail?.status ?? task.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              disabled={statusMutation.isPending}
              className="text-xs px-2 py-1 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            >
              {TASK_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-1.5">{t("fields.assignee")}</h4>
            <select
              value={detail?.assigneeId ?? task.assigneeId ?? ""}
              onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
              disabled={assignMutation.isPending || users.length === 0}
              className="w-full text-xs px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-1.5">{t("fields.description")}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">{task.description}</p>
            </div>
          )}

          {/* Attachments */}
          <EntityAttachments entityType="TASK" entityId={task.id} />

          {/* Comments */}
          <div>
            <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              {t("fields.comments")} ({comments.length})
            </h4>
            {comments.length === 0 ? (
              <p className="text-xs text-on-surface-variant/30 text-center py-4">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c: any) => (
                  <div key={c.id} className="bg-white/3 rounded-lg p-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">{c.content}</p>
                    <p className="text-[10px] font-mono text-on-surface-variant/30 mt-1.5">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        <div className="p-4 border-t border-outline-variant shrink-0">
          <div className="flex gap-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("actions.addComment")}
              rows={2}
              className="flex-1 px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-colors"
            />
            <button
              onClick={() => addComment.mutate()}
              disabled={!comment.trim() || addComment.isPending}
              className="px-3 bg-primary text-on-primary rounded-lg hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksList() {
  const { t } = useTranslation("tasks");
  const [showCreate, setShowCreate] = useState(false);
  const [updateTask, setUpdateTask] = useState<Task | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "calendar" | "gantt">("kanban");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.tasks.index.$get();
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const rawData = (data as any)?.data;
  const tasks: Task[] = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  const moveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.tasks[":id"].status.$put({
        param: { id },
        json: { status: status as any },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(colKey);
  };

  const onDrop = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (dragId) moveMutation.mutate({ id: dragId, status: colKey });
    setDragId(null);
    setDropTarget(null);
  };

  const onDragEnd = () => {
    setDragId(null);
    setDropTarget(null);
  };

  // ── Bulk actions ─────────────────────────────────────────────────────────────
  const bulkStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      await Promise.all(
        [...selected].map((id) =>
          api.tasks[":id"].status.$put({ param: { id }, json: { status: status as any } }),
        ),
      );
    },
    onSuccess: () => {
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((s) => (s.size === tasks.length ? new Set() : new Set(tasks.map((tk) => tk.id))));

  const byStatus = (status: string) => tasks.filter((tk) => tk.status === status);

  return (
    <>
      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} />}
      {updateTask && <UpdateStatusModal task={updateTask} onClose={() => setUpdateTask(null)} />}
      {detailTask && <TaskDetailDrawer task={detailTask} onClose={() => setDetailTask(null)} />}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-surface-container border border-outline-variant rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("kanban")}
                aria-label={t("views.kanban")}
                className={`p-1.5 rounded transition-colors ${viewMode === "kanban" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label={t("views.list")}
                className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                aria-label="Calendar"
                className={`p-1.5 rounded transition-colors ${viewMode === "calendar" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("gantt")}
                aria-label="Gantt"
                className={`p-1.5 rounded transition-colors ${viewMode === "gantt" ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                <BarChartHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" />
              {t("new")}
            </Button>
          </div>
        </div>

        {/* Bulk actions bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl">
            <span className="text-xs font-medium text-primary">{t("bulk.selected", { count: selected.size })}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLUMNS.map((col) => (
                <button
                  key={col.key}
                  onClick={() => bulkStatusMutation.mutate(col.key)}
                  disabled={bulkStatusMutation.isPending}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${col.accent} border-current/30 bg-current/5 hover:bg-current/10 disabled:opacity-40`}
                >
                  {t("bulk.moveTo", { status: t(col.labelKey) })}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
              className="ml-auto text-on-surface-variant/50 hover:text-on-surface transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-5 gap-3">
            {COLUMNS.map(({ key }) => (
              <div key={key} className="bg-surface-container border border-outline-variant rounded-xl p-3 h-64 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load tasks.</div>
        ) : viewMode === "kanban" ? (
          /* ── Kanban view ── */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {COLUMNS.map(({ key, labelKey, accent }) => {
              const col = byStatus(key);
              const isOver = dropTarget === key;
              const label = t(labelKey);
              return (
                <div
                  key={key}
                  onDragOver={(e) => onDragOver(e, key)}
                  onDrop={(e) => onDrop(e, key)}
                  className={`bg-surface-container border rounded-xl flex flex-col min-h-[60vh] transition-colors ${isOver ? "border-primary/50 bg-primary/5" : "border-outline-variant"}`}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-outline-variant">
                    <span className={`text-xs font-semibold ${accent}`}>{label}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/40">{col.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {col.length === 0 ? (
                      <div className={`text-center py-8 text-[11px] transition-colors ${isOver ? "text-primary/50" : "text-on-surface-variant/30"}`}>
                        {isOver ? "Drop here" : t("empty.title")}
                      </div>
                    ) : (
                      col.map((task) => {
                        const prio = PRIORITY_CONFIG[task.priority];
                        const isDragging = dragId === task.id;
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, task.id)}
                            onDragEnd={onDragEnd}
                            className={`cursor-grab active:cursor-grabbing transition-all ${isDragging ? "opacity-40 scale-95" : ""}`}
                          >
                            <button
                              onClick={() => setDetailTask(task)}
                              className="w-full text-left p-3 bg-surface-container-high border border-outline-variant rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all group"
                            >
                              <div className="flex items-center justify-between mb-2 gap-1">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${prio?.cls ?? "bg-white/8 text-on-surface-variant"}`}>
                                  {prio?.icon}{task.priority}
                                </span>
                                <DueDateBadge dueDate={task.dueDate} status={task.status} />
                              </div>
                              <p className="text-xs font-medium text-on-surface leading-snug group-hover:text-primary transition-colors">{task.title}</p>
                              {task.description && (
                                <p className="text-[11px] text-on-surface-variant/50 mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "calendar" ? (
          <TaskCalendar tasks={tasks} />
        ) : viewMode === "gantt" ? (
          <TaskGantt tasks={tasks} />
        ) : (
          /* ── List view with bulk select ── */
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <button onClick={toggleAll} aria-label={selected.size === tasks.length ? "Deselect all" : "Select all"} className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors">
                      {selected.size === tasks.length && tasks.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("fields.title")}</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-28">{t("fields.status")}</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-24 hidden md:table-cell">{t("fields.priority")}</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider w-28 hidden lg:table-cell">{t("fields.dueDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-on-surface-variant/40">{t("empty.title")}</td>
                  </tr>
                ) : tasks.map((task) => {
                  const prio = PRIORITY_CONFIG[task.priority];
                  const col = COLUMNS.find((c) => c.key === task.status);
                  const isSelected = selected.has(task.id);
                  return (
                    <tr
                      key={task.id}
                      className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-white/3"}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelect(task.id)}
                          aria-label={isSelected ? "Deselect task" : "Select task"}
                          className="text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailTask(task)}
                          className="text-sm font-medium text-on-surface hover:text-primary transition-colors text-left"
                        >
                          {task.title}
                        </button>
                        {task.description && (
                          <p className="text-xs text-on-surface-variant/50 mt-0.5 truncate max-w-xs">{task.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold ${col?.accent ?? "text-on-surface-variant"}`}>
                          {col ? t(col.labelKey) : task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${prio?.cls ?? "bg-white/8 text-on-surface-variant"}`}>
                          {prio?.icon}{task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {task.dueDate
                          ? <DueDateBadge dueDate={task.dueDate} status={task.status} />
                          : <span className="text-xs text-on-surface-variant/30">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tasks.length === 0 && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <ListChecks className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-on-surface mb-1">{t("empty.title")}</p>
            <button onClick={() => setShowCreate(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              {t("empty.create")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
