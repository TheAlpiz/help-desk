import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Zap, ChevronDown, Play, Pause, Copy,
  Mail, Tag, UserCheck, AlertTriangle, MessageSquare, Building2, ListChecks,
  Bell, Webhook, CheckCircle, XCircle, CalendarClock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/Toast";
import { useAppStore } from "@/store";
import { FieldValueInput } from "@/lib/fieldOptions";
import { Button } from "@/components/ui";



export const Route = createFileRoute("/_auth/automations")({
  component: AutomationsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "reply_received"
  | "sla_breached"
  | "tag_added";

type ConditionField =
  | "status" | "priority" | "tag" | "assignee" | "department" | "subject_contains"
  | "source" | "requester_email" | "has_attachment" | "ticket_age_hours" | "body";
type ConditionOperator =
  | "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty"
  | "starts_with" | "ends_with" | "greater_than" | "less_than" | "matches_regex" | "not_matches_regex";
type ActionType =
  | "set_status" | "set_priority" | "assign_to" | "set_department" | "add_tag" | "remove_tag"
  | "send_email" | "add_note" | "create_task"
  | "notify" | "webhook" | "resolve_ticket" | "close_ticket" | "set_due_date";

interface Condition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface AutoAction {
  id: string;
  type: ActionType;
  value: string;
  // create_task / notify config
  assignee?: string;
  priority?: TaskPriority;
  dueInDays?: number;
  // send_email config
  subject?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: TriggerType;
  conditions: Condition[];
  actions: AutoAction[];
  enabled: boolean;
  isActive?: boolean;
  runCount: number;
  conditionMatch?: "all" | "any";
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Stable key order for the dropdowns. Visible labels are resolved at render via
// i18n (`triggerLabels.*`, `conditionFields.*`, `operators.*`, `actionLabels.*`).
const TRIGGER_KEYS: TriggerType[] = [
  "ticket_created", "ticket_updated", "ticket_assigned", "reply_received", "sla_breached", "tag_added",
];

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
  ticket_created: <Zap className="w-3.5 h-3.5" />,
  ticket_updated: <Zap className="w-3.5 h-3.5" />,
  ticket_assigned: <UserCheck className="w-3.5 h-3.5" />,
  reply_received: <MessageSquare className="w-3.5 h-3.5" />,
  sla_breached: <AlertTriangle className="w-3.5 h-3.5" />,
  tag_added: <Tag className="w-3.5 h-3.5" />,
};

const FIELD_KEYS: ConditionField[] = [
  "status", "priority", "tag", "assignee", "department", "subject_contains",
  "source", "requester_email", "has_attachment", "ticket_age_hours", "body",
];

const OPERATOR_KEYS: ConditionOperator[] = [
  "equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty",
  "starts_with", "ends_with", "greater_than", "less_than", "matches_regex", "not_matches_regex",
];

// Per-action icon + whether it takes a value input. Label comes from i18n.
const ACTION_META: Record<ActionType, { icon: React.ReactNode; hasValue: boolean }> = {
  set_status: { icon: <Zap className="w-3 h-3" />, hasValue: true },
  set_priority: { icon: <AlertTriangle className="w-3 h-3" />, hasValue: true },
  assign_to: { icon: <UserCheck className="w-3 h-3" />, hasValue: true },
  set_department: { icon: <Building2 className="w-3 h-3" />, hasValue: true },
  add_tag: { icon: <Tag className="w-3 h-3" />, hasValue: true },
  remove_tag: { icon: <Tag className="w-3 h-3" />, hasValue: true },
  send_email: { icon: <Mail className="w-3 h-3" />, hasValue: true },
  add_note: { icon: <MessageSquare className="w-3 h-3" />, hasValue: true },
  create_task: { icon: <ListChecks className="w-3 h-3" />, hasValue: true },
  notify: { icon: <Bell className="w-3 h-3" />, hasValue: true },
  webhook: { icon: <Webhook className="w-3 h-3" />, hasValue: true },
  resolve_ticket: { icon: <CheckCircle className="w-3 h-3" />, hasValue: false },
  close_ticket: { icon: <XCircle className="w-3 h-3" />, hasValue: false },
  set_due_date: { icon: <CalendarClock className="w-3 h-3" />, hasValue: false },
};
const ACTION_KEYS = Object.keys(ACTION_META) as ActionType[];

function normalizeRule(r: any): AutomationRule {
  return {
    id: r.id,
    name: r.name ?? "Unnamed",
    trigger: r.trigger ?? "ticket_created",
    conditions: (r.conditions ?? []).map((c: any, i: number) => ({
      id: c.id ?? String(i),
      field: c.field ?? "status",
      operator: c.operator ?? "equals",
      value: c.value ?? "",
    })),
    actions: (r.actions ?? []).map((a: any, i: number) => ({
      id: a.id ?? String(i),
      type: a.type ?? "set_status",
      value: a.value ?? "",
      assignee: a.assignee,
      priority: a.priority,
      dueInDays: a.dueInDays,
      subject: a.subject,
    })),
    enabled: r.isActive ?? r.enabled ?? false,
    isActive: r.isActive,
    runCount: r.runCount ?? 0,
    conditionMatch: r.conditionMatch ?? "all",
  };
}

const inputCls =
  "px-2.5 py-1.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

const selectCls = `${inputCls} appearance-none pr-6`;

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Components ───────────────────────────────────────────────────────────────

function ConditionRow({
  cond,
  onChange,
  onRemove,
}: {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("automations");
  const needsValue = cond.operator !== "is_empty" && cond.operator !== "is_not_empty";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          value={cond.field}
          onChange={(e) => onChange({ field: e.target.value as ConditionField })}
          className={selectCls}
          aria-label={t("conditionFields.status")}
        >
          {FIELD_KEYS.map((f) => (
            <option key={f} value={f}>{t(`conditionFields.${f}`)}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={cond.operator}
          onChange={(e) => onChange({ operator: e.target.value as ConditionOperator })}
          className={selectCls}
          aria-label={t("operators.equals")}
        >
          {OPERATOR_KEYS.map((op) => (
            <option key={op} value={op}>{t(`operators.${op}`)}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
      </div>
      {needsValue && (
        <FieldValueInput
          optionKey={cond.field}
          value={cond.value}
          onChange={(v) => onChange({ value: v })}
          inputClassName={`${inputCls} w-32`}
          selectClassName={`${selectCls} w-32`}
          ariaLabel="Condition value"
        />
      )}
      <button
        onClick={onRemove}
        aria-label="Remove condition"
        className="p-1 rounded text-error/50 hover:text-error transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function ActionRow({
  action,
  onChange,
  onRemove,
}: {
  action: AutoAction;
  onChange: (patch: Partial<AutoAction>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("automations");
  const meta = ACTION_META[action.type];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-on-surface-variant/60 shrink-0">
        {meta.icon}
      </div>
      <div className="relative">
        <select
          value={action.type}
          onChange={(e) => onChange({ type: e.target.value as ActionType })}
          className={selectCls}
          aria-label={t("fields.actions")}
        >
          {ACTION_KEYS.map((k) => (
            <option key={k} value={k}>{t(`actionLabels.${k}`)}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
      </div>
      {meta.hasValue && (
        <FieldValueInput
          optionKey={action.type}
          value={action.value}
          onChange={(v) => onChange({ value: v })}
          inputClassName={`${inputCls} w-36`}
          selectClassName={`${selectCls} w-36`}
          ariaLabel="Action value"
          placeholder={
            action.type === "create_task" ? t("placeholders.taskTitle")
              : action.type === "send_email" ? t("placeholders.emailBody")
              : action.type === "notify" ? t("placeholders.message")
              : action.type === "webhook" ? t("placeholders.webhook")
              : action.type === "add_note" ? t("placeholders.note")
              : t("placeholders.value")
          }
        />
      )}

      {action.type === "create_task" && (
        <>
          {/* Assignee (optional) — reuses the agent directory dropdown */}
          <FieldValueInput
            optionKey="assign_to"
            value={action.assignee ?? ""}
            onChange={(v) => onChange({ assignee: v || undefined })}
            selectClassName={`${selectCls} w-36`}
            inputClassName={`${inputCls} w-36`}
            ariaLabel="Task assignee"
          />
          <div className="relative">
            <select
              value={action.priority ?? "MEDIUM"}
              onChange={(e) => onChange({ priority: e.target.value as TaskPriority })}
              className={`${selectCls} w-28`}
              aria-label="Task priority"
            >
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{t(`taskPriority.${p}`)}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
          </div>
          <input
            type="number"
            min={0}
            max={365}
            value={action.dueInDays ?? ""}
            onChange={(e) =>
              onChange({ dueInDays: e.target.value === "" ? undefined : Number(e.target.value) })
            }
            placeholder={t("placeholders.dueDays")}
            className={`${inputCls} w-28`}
            aria-label={t("placeholders.dueDays")}
          />
        </>
      )}

      {action.type === "send_email" && (
        <>
          <input
            value={action.subject ?? ""}
            onChange={(e) => onChange({ subject: e.target.value || undefined })}
            placeholder={t("placeholders.subject")}
            className={`${inputCls} w-40`}
            aria-label={t("placeholders.subject")}
          />
          {/* Recipient — defaults to the ticket requester; pick an agent to override */}
          <FieldValueInput
            optionKey="assign_to"
            value={action.assignee ?? ""}
            onChange={(v) => onChange({ assignee: v || undefined })}
            selectClassName={`${selectCls} w-36`}
            inputClassName={`${inputCls} w-36`}
            ariaLabel="Email recipient (default: requester)"
          />
        </>
      )}

      {action.type === "notify" && (
        /* Target — defaults to the ticket assignee; pick an agent to override */
        <FieldValueInput
          optionKey="assign_to"
          value={action.assignee ?? ""}
          onChange={(v) => onChange({ assignee: v || undefined })}
          selectClassName={`${selectCls} w-36`}
          inputClassName={`${inputCls} w-36`}
          ariaLabel="Notify target (default: assignee)"
        />
      )}

      {action.type === "set_due_date" && (
        <input
          type="number"
          min={0}
          max={365}
          value={action.dueInDays ?? ""}
          onChange={(e) => onChange({ dueInDays: e.target.value === "" ? undefined : Number(e.target.value) })}
          placeholder={t("placeholders.dueDays")}
          className={`${inputCls} w-28`}
          aria-label={t("placeholders.dueDays")}
        />
      )}

      <button
        onClick={onRemove}
        aria-label="Remove action"
        className="p-1 rounded text-error/50 hover:text-error transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function RuleCard({
  rule,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  rule: AutomationRule;
  onUpdate: (patch: Partial<AutomationRule>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useTranslation("automations");

  const addCondition = () =>
    onUpdate({
      conditions: [
        ...rule.conditions,
        { id: uid(), field: "status", operator: "equals", value: "" },
      ],
    });

  const updateCondition = (id: string, patch: Partial<Condition>) =>
    onUpdate({
      conditions: rule.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const removeCondition = (id: string) =>
    onUpdate({ conditions: rule.conditions.filter((c) => c.id !== id) });

  const addAction = () =>
    onUpdate({
      actions: [...rule.actions, { id: uid(), type: "set_status", value: "" }],
    });

  const updateAction = (id: string, patch: Partial<AutoAction>) =>
    onUpdate({ actions: rule.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  const removeAction = (id: string) =>
    onUpdate({ actions: rule.actions.filter((a) => a.id !== id) });

  return (
    <div className={`bg-surface-container border rounded-xl overflow-hidden transition-opacity ${rule.enabled ? "border-outline-variant" : "border-outline-variant/40 opacity-60"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/50">
        <button
          onClick={() => onUpdate({ enabled: !rule.enabled })}
          aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${rule.enabled ? "bg-primary" : "bg-outline-variant"}`}
        >
          <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.enabled ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <input
          value={rule.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent text-sm font-medium text-on-surface focus:outline-none"
          aria-label={t("fields.name")}
        />
        {rule.runCount > 0 && (
          <span className="text-[10px] text-on-surface-variant/40 font-mono">{t("ui.runs", { count: rule.runCount })}</span>
        )}
        <button onClick={onDuplicate} aria-label="Duplicate rule" className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} aria-label="Delete rule" className="p-1 rounded text-error/50 hover:text-error transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Trigger */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide w-16 shrink-0">{t("ui.when")}</span>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary`}>
              {TRIGGER_ICONS[rule.trigger]}
            </span>
            <div className="relative">
              <select
                value={rule.trigger}
                onChange={(e) => onUpdate({ trigger: e.target.value as TriggerType })}
                className={`${selectCls} text-xs`}
                aria-label={t("fields.trigger")}
              >
                {TRIGGER_KEYS.map((trig) => (
                  <option key={trig} value={trig}>{t(`triggerLabels.${trig}`)}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">{t("fields.conditions")}</span>
              {/* AND/OR matcher — only meaningful with 2+ conditions */}
              {rule.conditions.length > 1 && (
                <div className="inline-flex rounded-md border border-outline-variant overflow-hidden" role="group" aria-label={t("fields.conditions")}>
                  {(["all", "any"] as const).map((m) => {
                    const selected = (rule.conditionMatch ?? "all") === m;
                    return (
                      <button
                        key={m}
                        onClick={() => onUpdate({ conditionMatch: m })}
                        title={m === "all" ? t("ui.matchAllHint") : t("ui.matchAnyHint")}
                        className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                          selected
                            ? "bg-primary/15 text-primary"
                            : "text-on-surface-variant/50 hover:text-on-surface-variant"
                        }`}
                      >
                        {m === "all" ? t("ui.matchAll") : t("ui.matchAny")}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={addCondition}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              {t("ui.addCondition")}
            </button>
          </div>
          {rule.conditions.length === 0 ? (
            <p className="text-xs text-on-surface-variant/30 italic">{t("ui.noConditions")}</p>
          ) : (
            rule.conditions.map((c, i) => (
              <div key={c.id} className="space-y-2">
                {i > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-on-surface-variant/40 pl-1">
                    {(rule.conditionMatch ?? "all") === "any" ? t("ui.or") : t("ui.and")}
                  </span>
                )}
                <ConditionRow
                  cond={c}
                  onChange={(patch) => updateCondition(c.id, patch)}
                  onRemove={() => removeCondition(c.id)}
                />
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">{t("fields.actions")}</span>
            <button
              onClick={addAction}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              {t("ui.addAction")}
            </button>
          </div>
          {rule.actions.length === 0 ? (
            <p className="text-xs text-error/60 italic">{t("ui.noActions")}</p>
          ) : (
            rule.actions.map((a) => (
              <ActionRow
                key={a.id}
                action={a}
                onChange={(patch) => updateAction(a.id, patch)}
                onRemove={() => removeAction(a.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AutomationsPage() {
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const { t } = useTranslation("automations");
  // Local draft state on top of server data so inline editing works
  const [localRules, setLocalRules] = useState<AutomationRule[] | null>(null);

  const { data: serverRules, isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const res = await api.automations.index.$get();
      const body = await res.json() as any;
      return ((body?.data ?? []) as any[]).map(normalizeRule);
    },
  });

  // Mirror server data into the editable draft whenever a fetch returns new data
  // (initial load + after any invalidation). `serverRules` keeps a stable ref
  // between fetches, so inline edits to `localRules` aren't clobbered until the
  // next real refetch.
  useEffect(() => {
    if (serverRules) setLocalRules(serverRules);
  }, [serverRules]);

  const rules = localRules ?? [];

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.automations[":id"].toggle.$post({ param: { id } });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
    onError: (e: any) => showError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.automations[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success(t("toasts.ruleDeleted")); },
    onError: (e: any) => showError(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<AutomationRule, "id" | "runCount">) => {
      const res = await api.automations.index.$post({
        json: {
          name: rule.name,
          trigger: rule.trigger as any,
          conditions: rule.conditions as any,
          actions: rule.actions as any,
          conditionMatch: rule.conditionMatch ?? "all",
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success(t("toasts.ruleCreated")); },
    onError: (e: any) => showError(e.message),
  });

  const saveAllMutation = useMutation({
    mutationFn: async (ruleList: AutomationRule[]) => {
      await Promise.all(ruleList.map(async (rule) => {
        const res = await api.automations[":id"].$put({
          param: { id: rule.id },
          json: {
            name: rule.name,
            trigger: rule.trigger as any,
            conditions: rule.conditions as any,
            actions: rule.actions as any,
            conditionMatch: rule.conditionMatch ?? "all",
            isActive: rule.enabled,
          },
        });
        if (!res.ok) throw new Error(await res.text());
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success(t("toasts.allSaved")); },
    onError: (e: any) => showError(e.message),
  });

  const addRule = () => {
    const newRule: AutomationRule = {
      id: uid(),
      name: t("new"),
      trigger: "ticket_created",
      conditions: [],
      actions: [{ id: uid(), type: "set_status", value: "" }],
      enabled: false,
      runCount: 0,
      conditionMatch: "all",
    };
    // POST immediately; on success, server version replaces local draft
    createMutation.mutate(newRule);
  };

  const updateRule = (id: string, patch: Partial<AutomationRule>) => {
    setLocalRules((prev) => (prev ?? rules).map((x) => (x.id === id ? { ...x, ...patch } : x)));
    // Toggle enable/disable = immediate backend call
    if ("enabled" in patch) {
      toggleMutation.mutate(id);
    }
  };

  const removeRule = (id: string) => {
    setLocalRules((prev) => (prev ?? rules).filter((x) => x.id !== id));
    deleteMutation.mutate(id);
  };

  const duplicateRule = (rule: AutomationRule) => {
    createMutation.mutate({ ...rule, name: `${rule.name} (${t("ui.copySuffix")})`, enabled: false });
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const savedRules = rules.filter((r) => !(r.id.length < 30)); // only server-persisted rules

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            {t("ui.subtitle", { count: activeCount })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveAllMutation.mutate(savedRules)}
            disabled={saveAllMutation.isPending}
            className="px-3 py-1.5 text-xs border border-outline-variant rounded-lg text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors disabled:opacity-40"
          >
            {saveAllMutation.isPending ? t("ui.saving") : t("ui.saveAll")}
          </button>
          <Button onClick={addRule} disabled={createMutation.isPending} loading={createMutation.isPending}>
            {!createMutation.isPending && <><Plus className="w-3.5 h-3.5" />{t("new")}</>}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t("ui.totalRules"), value: rules.length, icon: <Zap className="w-3.5 h-3.5" /> },
          { label: t("fields.active"), value: activeCount, icon: <Play className="w-3.5 h-3.5 text-emerald-400" /> },
          { label: t("ui.inactive"), value: rules.length - activeCount, icon: <Pause className="w-3.5 h-3.5 text-on-surface-variant/40" /> },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container border border-outline-variant rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-on-surface-variant/50">{s.icon}</span>
            <div>
              <p className="text-lg font-bold text-on-surface">{s.value}</p>
              <p className="text-[10px] text-on-surface-variant/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs text-on-surface-variant/40">{t("ui.loading")}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-surface-container border border-outline-variant rounded-xl">
          <Zap className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant/40">{t("empty.title")}</p>
          <Button onClick={addRule} className="mt-3">
            <Plus className="w-3.5 h-3.5" />
            {t("new")}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onUpdate={(patch) => updateRule(rule.id, patch)}
              onRemove={() => removeRule(rule.id)}
              onDuplicate={() => duplicateRule(rule)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
