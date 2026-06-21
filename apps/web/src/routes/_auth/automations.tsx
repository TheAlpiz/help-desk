import { createFileRoute } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Zap, ChevronDown, Play, Pause, Copy,
  Mail, Tag, UserCheck, AlertTriangle, MessageSquare, Building2,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAppStore } from "@/store";
import { FieldValueInput } from "@/lib/fieldOptions";
import { Button } from "@/components/ui";

function getHeaders() {
  const { accessToken, tenantId } = useAppStore.getState();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-Tenant-ID": tenantId ?? "",
  };
}

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

type ConditionField = "status" | "priority" | "tag" | "assignee" | "department" | "subject_contains";
type ConditionOperator = "equals" | "not_equals" | "contains" | "not_contains" | "is_empty" | "is_not_empty";
type ActionType = "set_status" | "set_priority" | "assign_to" | "set_department" | "add_tag" | "remove_tag" | "send_email" | "add_note";

interface Condition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

interface AutoAction {
  id: string;
  type: ActionType;
  value: string;
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

const TRIGGER_LABELS: Record<TriggerType, string> = {
  ticket_created: "Ticket is created",
  ticket_updated: "Ticket is updated",
  ticket_assigned: "Ticket is assigned",
  reply_received: "Reply is received",
  sla_breached: "SLA is breached",
  tag_added: "Tag is added",
};

const TRIGGER_ICONS: Record<TriggerType, React.ReactNode> = {
  ticket_created: <Zap className="w-3.5 h-3.5" />,
  ticket_updated: <Zap className="w-3.5 h-3.5" />,
  ticket_assigned: <UserCheck className="w-3.5 h-3.5" />,
  reply_received: <MessageSquare className="w-3.5 h-3.5" />,
  sla_breached: <AlertTriangle className="w-3.5 h-3.5" />,
  tag_added: <Tag className="w-3.5 h-3.5" />,
};

const FIELD_LABELS: Record<ConditionField, string> = {
  status: "Status",
  priority: "Priority",
  tag: "Tag",
  assignee: "Assignee",
  department: "Department",
  subject_contains: "Subject",
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  not_contains: "does not contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

const ACTION_LABELS: Record<ActionType, { label: string; icon: React.ReactNode; hasValue: boolean }> = {
  set_status: { label: "Set status to", icon: <Zap className="w-3 h-3" />, hasValue: true },
  set_priority: { label: "Set priority to", icon: <AlertTriangle className="w-3 h-3" />, hasValue: true },
  assign_to: { label: "Assign to agent", icon: <UserCheck className="w-3 h-3" />, hasValue: true },
  set_department: { label: "Assign to department", icon: <Building2 className="w-3 h-3" />, hasValue: true },
  add_tag: { label: "Add tag", icon: <Tag className="w-3 h-3" />, hasValue: true },
  remove_tag: { label: "Remove tag", icon: <Tag className="w-3 h-3" />, hasValue: true },
  send_email: { label: "Send email notification", icon: <Mail className="w-3 h-3" />, hasValue: false },
  add_note: { label: "Add internal note", icon: <MessageSquare className="w-3 h-3" />, hasValue: true },
};

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
  const needsValue = cond.operator !== "is_empty" && cond.operator !== "is_not_empty";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="relative">
        <select
          value={cond.field}
          onChange={(e) => onChange({ field: e.target.value as ConditionField })}
          className={selectCls}
          aria-label="Condition field"
        >
          {(Object.keys(FIELD_LABELS) as ConditionField[]).map((f) => (
            <option key={f} value={f}>{FIELD_LABELS[f]}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
      </div>
      <div className="relative">
        <select
          value={cond.operator}
          onChange={(e) => onChange({ operator: e.target.value as ConditionOperator })}
          className={selectCls}
          aria-label="Condition operator"
        >
          {(Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map((op) => (
            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
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
  const meta = ACTION_LABELS[action.type];
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
          aria-label="Action type"
        >
          {(Object.keys(ACTION_LABELS) as ActionType[]).map((t) => (
            <option key={t} value={t}>{ACTION_LABELS[t].label}</option>
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
          aria-label="Rule name"
        />
        {rule.runCount > 0 && (
          <span className="text-[10px] text-on-surface-variant/40 font-mono">{rule.runCount} runs</span>
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
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide w-16 shrink-0">When</span>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary`}>
              {TRIGGER_ICONS[rule.trigger]}
            </span>
            <div className="relative">
              <select
                value={rule.trigger}
                onChange={(e) => onUpdate({ trigger: e.target.value as TriggerType })}
                className={`${selectCls} text-xs`}
                aria-label="Trigger event"
              >
                {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((t) => (
                  <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">If (all match)</span>
            <button
              onClick={addCondition}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              + Add condition
            </button>
          </div>
          {rule.conditions.length === 0 ? (
            <p className="text-xs text-on-surface-variant/30 italic">No conditions — rule runs on every trigger</p>
          ) : (
            rule.conditions.map((c) => (
              <ConditionRow
                key={c.id}
                cond={c}
                onChange={(patch) => updateCondition(c.id, patch)}
                onRemove={() => removeCondition(c.id)}
              />
            ))
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Then</span>
            <button
              onClick={addAction}
              className="text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              + Add action
            </button>
          </div>
          {rule.actions.length === 0 ? (
            <p className="text-xs text-error/60 italic">No actions configured — add at least one</p>
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
  // Local draft state on top of server data so inline editing works
  const [localRules, setLocalRules] = useState<AutomationRule[] | null>(null);

  const { data: serverRules, isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: async () => {
      const res = await authFetch("/api/automations", { headers: getHeaders() });
      const json = await res.json();
      return ((json?.data ?? []) as any[]).map(normalizeRule);
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
      const res = await authFetch(`/api/automations/${id}/toggle`, { method: "POST", headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] }),
    onError: (e: any) => showError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/automations/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success("Rule deleted"); },
    onError: (e: any) => showError(e.message),
  });

  const createMutation = useMutation({
    mutationFn: async (rule: Omit<AutomationRule, "id" | "runCount">) => {
      const res = await authFetch("/api/automations", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name: rule.name,
          trigger: rule.trigger,
          conditions: rule.conditions,
          actions: rule.actions,
          conditionMatch: rule.conditionMatch ?? "all",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success("Rule created"); },
    onError: (e: any) => showError(e.message),
  });

  const saveAllMutation = useMutation({
    mutationFn: async (ruleList: AutomationRule[]) => {
      await Promise.all(ruleList.map(async (rule) => {
        const res = await authFetch(`/api/automations/${rule.id}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            name: rule.name,
            trigger: rule.trigger,
            conditions: rule.conditions,
            actions: rule.actions,
            conditionMatch: rule.conditionMatch ?? "all",
            isActive: rule.enabled,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      }));
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automations"] }); success("All rules saved"); },
    onError: (e: any) => showError(e.message),
  });

  const addRule = () => {
    const newRule: AutomationRule = {
      id: uid(),
      name: "New automation",
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
    createMutation.mutate({ ...rule, name: `${rule.name} (copy)`, enabled: false });
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const savedRules = rules.filter((r) => !(r.id.length < 30)); // only server-persisted rules

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface">Automation Rules</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            {activeCount} active rule{activeCount !== 1 ? "s" : ""} · Runs automatically on ticket events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveAllMutation.mutate(savedRules)}
            disabled={saveAllMutation.isPending}
            className="px-3 py-1.5 text-xs border border-outline-variant rounded-lg text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors disabled:opacity-40"
          >
            {saveAllMutation.isPending ? "Saving…" : "Save all"}
          </button>
          <Button onClick={addRule} disabled={createMutation.isPending} loading={createMutation.isPending}>
            {!createMutation.isPending && <><Plus className="w-3.5 h-3.5" />New rule</>}
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total rules", value: rules.length, icon: <Zap className="w-3.5 h-3.5" /> },
          { label: "Active", value: activeCount, icon: <Play className="w-3.5 h-3.5 text-emerald-400" /> },
          { label: "Inactive", value: rules.length - activeCount, icon: <Pause className="w-3.5 h-3.5 text-on-surface-variant/40" /> },
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
        <div className="py-16 text-center text-xs text-on-surface-variant/40">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 bg-surface-container border border-outline-variant rounded-xl">
          <Zap className="w-10 h-10 text-on-surface-variant/15 mx-auto mb-3" />
          <p className="text-sm text-on-surface-variant/40">No automation rules</p>
          <Button onClick={addRule} className="mt-3">
            <Plus className="w-3.5 h-3.5" />
            Create first rule
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
