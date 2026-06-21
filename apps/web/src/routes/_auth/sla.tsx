import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { AlertTriangle, Clock, Plus, Trash2, ChevronDown, Bell, UserCheck, Tag as TagIcon } from "lucide-react";
import { SlaTable } from "@/features/sla/components/SlaTable";
import { SlaCountdown } from "@/components/SlaCountdown";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/_auth/sla")({
  validateSearch: z.object({ tab: z.string().optional() }),
  component: SlaPage,
});

function SlaBreachDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["tickets", "at-risk"],
    queryFn: async () => {
      // Fetch open/in-progress tickets — client-side filter for SLA at-risk
      const res = await api.tickets.index.$get({ query: { limit: "100", offset: "0", status: "open" } as any });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const raw = (data as any)?.data ?? {};
  const tickets: any[] = Array.isArray(raw) ? raw : raw.data ?? [];

  const now = Date.now();
  const atRisk = tickets.filter((t: any) => {
    if (!t.firstResponseTargetAt || t.firstResponseMet) return false;
    const remaining = new Date(t.firstResponseTargetAt).getTime() - now;
    return remaining < 2 * 60 * 60 * 1000; // < 2h
  });

  const breached = atRisk.filter((t: any) => new Date(t.firstResponseTargetAt).getTime() < now);
  const warning = atRisk.filter((t: any) => new Date(t.firstResponseTargetAt).getTime() >= now);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Breached", value: breached.length, color: "text-red-400" },
          { label: "At risk (< 2h)", value: warning.length, color: "text-amber-400" },
          { label: "Total open", value: tickets.length, color: "text-on-surface" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container border border-outline-variant rounded-xl p-4">
            <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{s.label}</p>
            {isLoading ? (
              <div className="h-7 w-8 bg-white/5 rounded animate-pulse mt-1" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {atRisk.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-on-surface">At-risk tickets</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {atRisk.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    to="/tickets/$ticketId"
                    params={{ ticketId: t.id }}
                    className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
                  >
                    {t.subject}
                  </Link>
                  <p className="text-[10px] font-mono text-on-surface-variant/40">{t.id.slice(0, 8)}</p>
                </div>
                <SlaCountdown
                  targetAt={t.firstResponseTargetAt}
                  met={t.firstResponseMet}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && atRisk.length === 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center">
          <Clock className="w-8 h-8 text-emerald-400/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-on-surface">All tickets within SLA</p>
          <p className="text-xs text-on-surface-variant/40 mt-1">No tickets are at risk of breaching SLA</p>
        </div>
      )}
    </div>
  );
}

// ─── Business hours editor ────────────────────────────────────────────────────

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type DaySchedule = { enabled: boolean; start: string; end: string };
type BusinessHours = Record<typeof DAYS[number], DaySchedule>;

const DEFAULT_HOURS: BusinessHours = {
  Monday: { enabled: true, start: "09:00", end: "17:00" },
  Tuesday: { enabled: true, start: "09:00", end: "17:00" },
  Wednesday: { enabled: true, start: "09:00", end: "17:00" },
  Thursday: { enabled: true, start: "09:00", end: "17:00" },
  Friday: { enabled: true, start: "09:00", end: "17:00" },
  Saturday: { enabled: false, start: "09:00", end: "17:00" },
  Sunday: { enabled: false, start: "09:00", end: "17:00" },
};

function BusinessHoursEditor() {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [timezone, setTimezone] = useState("UTC");
  const [saved, setSaved] = useState(false);

  const update = (day: typeof DAYS[number], patch: Partial<DaySchedule>) =>
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  const save = () => {
    // TODO: POST /api/organizations/business-hours when backend ready
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-on-surface">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        >
          {["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Istanbul", "Asia/Tokyo"].map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-outline-variant grid grid-cols-[7rem_3rem_1fr_0.5rem_1fr] gap-2 items-center">
          <span className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Day</span>
          <span className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">On</span>
          <span className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Start</span>
          <span />
          <span className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">End</span>
        </div>
        <div className="divide-y divide-outline-variant">
          {DAYS.map((day) => {
            const schedule = hours[day];
            return (
              <div key={day} className="px-4 py-3 grid grid-cols-[7rem_3rem_1fr_0.5rem_1fr] gap-2 items-center">
                <span className={`text-xs font-medium ${schedule.enabled ? "text-on-surface" : "text-on-surface-variant/40"}`}>
                  {day}
                </span>
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  onChange={(e) => update(day, { enabled: e.target.checked })}
                  className="accent-primary w-4 h-4"
                />
                <input
                  type="time"
                  value={schedule.start}
                  disabled={!schedule.enabled}
                  onChange={(e) => update(day, { start: e.target.value })}
                  className="px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 transition-colors"
                />
                <span className="text-xs text-on-surface-variant/40 text-center">–</span>
                <input
                  type="time"
                  value={schedule.end}
                  disabled={!schedule.enabled}
                  onChange={(e) => update(day, { end: e.target.value })}
                  className="px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40 transition-colors"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          {saved ? "Saved!" : "Save schedule"}
        </button>
      </div>
      <p className="text-[10px] text-on-surface-variant/30 text-center">Business hours backend endpoint pending</p>
    </div>
  );
}

// ─── Escalation rule builder ──────────────────────────────────────────────────

type EscalationCondition = "breach_imminent" | "first_breach" | "repeated_breach" | "no_response";
type EscalationAction = "notify_agent" | "notify_manager" | "reassign" | "add_tag" | "increase_priority";

interface ActionDef { id: string; type: EscalationAction; value: string }

interface EscalationRule {
  id: string;
  name: string;
  condition: EscalationCondition;
  thresholdMinutes: number;
  actions: ActionDef[];
  isActive: boolean;
  dirty?: boolean;
  isNew?: boolean;
}

const CONDITION_LABELS: Record<EscalationCondition, string> = {
  breach_imminent: "SLA breach imminent (within threshold)",
  first_breach: "First SLA breach",
  repeated_breach: "Repeated SLA breach",
  no_response: "No agent response within threshold",
};

const ACTION_LABELS: Record<EscalationAction, { label: string; icon: React.ReactNode }> = {
  notify_agent: { label: "Notify assigned agent", icon: <Bell className="w-3 h-3" /> },
  notify_manager: { label: "Notify team manager", icon: <Bell className="w-3 h-3" /> },
  reassign: { label: "Reassign to available agent", icon: <UserCheck className="w-3 h-3" /> },
  add_tag: { label: "Add escalated tag", icon: <TagIcon className="w-3 h-3" /> },
  increase_priority: { label: "Increase ticket priority", icon: <AlertTriangle className="w-3 h-3" /> },
};

const inputCls =
  "px-2.5 py-1.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

const newActionId = () => `act_${Math.random().toString(36).slice(2, 10)}`;

function escalationHeaders() {
  const state = useAppStore.getState();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

function EscalationRuleBuilder() {
  const qc = useQueryClient();
  const { success, error: toastError } = useToast();

  const { data: serverData } = useQuery({
    queryKey: ["sla-escalation-rules"],
    queryFn: async () => {
      const res = await fetch("/api/sla-escalation-rules", { headers: escalationHeaders() });
      if (!res.ok) throw new Error("Failed to load rules");
      const json = await res.json();
      return (json.data ?? []) as any[];
    },
  });

  const [rules, setRules] = useState<EscalationRule[]>([]);

  useEffect(() => {
    if (!serverData) return;
    setRules(
      serverData.map((r) => ({
        id: r.id,
        name: r.name,
        condition: r.condition,
        thresholdMinutes: r.thresholdMinutes ?? 30,
        actions: (r.actions as any[]).map((a) => ({ id: a.id ?? newActionId(), type: a.type, value: a.value ?? "" })),
        isActive: r.isActive,
      })),
    );
  }, [serverData]);

  const createMut = useMutation({
    mutationFn: async (rule: EscalationRule) => {
      const res = await fetch("/api/sla-escalation-rules", {
        method: "POST",
        headers: escalationHeaders(),
        body: JSON.stringify({
          name: rule.name,
          condition: rule.condition,
          thresholdMinutes: rule.thresholdMinutes,
          actions: rule.actions,
          isActive: rule.isActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? "Create failed");
      return res.json();
    },
  });

  const updateMut = useMutation({
    mutationFn: async (rule: EscalationRule) => {
      const res = await fetch(`/api/sla-escalation-rules/${rule.id}`, {
        method: "PUT",
        headers: escalationHeaders(),
        body: JSON.stringify({
          name: rule.name,
          condition: rule.condition,
          thresholdMinutes: rule.thresholdMinutes,
          actions: rule.actions,
          isActive: rule.isActive,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.message ?? "Update failed");
      return res.json();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sla-escalation-rules/${id}`, { method: "DELETE", headers: escalationHeaders() });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-escalation-rules"] }),
  });

  const toggleMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sla-escalation-rules/${id}/toggle`, { method: "POST", headers: escalationHeaders() });
      if (!res.ok) throw new Error("Toggle failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sla-escalation-rules"] }),
  });

  const addRule = () => {
    setRules((r) => [
      ...r,
      {
        id: `new_${Date.now()}`,
        name: "New rule",
        condition: "first_breach",
        thresholdMinutes: 60,
        actions: [{ id: newActionId(), type: "notify_agent", value: "" }],
        isActive: true,
        dirty: true,
        isNew: true,
      },
    ]);
  };

  const removeRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    setRules((r) => r.filter((x) => x.id !== id));
    if (rule && !rule.isNew) {
      try { await deleteMut.mutateAsync(id); } catch (e: any) { toastError(e.message); }
    }
  };

  const updateRule = (id: string, patch: Partial<EscalationRule>) =>
    setRules((r) => r.map((x) => (x.id === id ? { ...x, ...patch, dirty: true } : x)));

  const toggleEnabled = async (rule: EscalationRule) => {
    if (rule.isNew) {
      updateRule(rule.id, { isActive: !rule.isActive });
      return;
    }
    setRules((r) => r.map((x) => (x.id === rule.id ? { ...x, isActive: !x.isActive } : x)));
    try { await toggleMut.mutateAsync(rule.id); } catch (e: any) { toastError(e.message); }
  };

  const toggleAction = (ruleId: string, action: EscalationAction) => {
    setRules((r) =>
      r.map((x) => {
        if (x.id !== ruleId) return x;
        const exists = x.actions.find((a) => a.type === action);
        return {
          ...x,
          dirty: true,
          actions: exists
            ? x.actions.filter((a) => a.type !== action)
            : [...x.actions, { id: newActionId(), type: action, value: "" }],
        };
      }),
    );
  };

  const handleSave = async () => {
    const dirty = rules.filter((r) => r.dirty);
    if (dirty.length === 0) return;
    try {
      for (const rule of dirty) {
        if (rule.actions.length === 0) {
          toastError(`Rule "${rule.name}" needs at least one action`);
          return;
        }
        if (rule.isNew) await createMut.mutateAsync(rule);
        else await updateMut.mutateAsync(rule);
      }
      success("Escalation rules saved");
      qc.invalidateQueries({ queryKey: ["sla-escalation-rules"] });
    } catch (e: any) {
      toastError(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          Rules fire automatically when SLA conditions are met.
        </p>
        <button
          onClick={addRule}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/25 text-primary text-xs font-medium rounded-lg hover:bg-primary/25 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add rule
        </button>
      </div>

      {rules.length === 0 && (
        <div className="text-center py-10 text-on-surface-variant/40 text-sm">
          No escalation rules. Add one to get started.
        </div>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-surface-container border rounded-xl p-4 space-y-4 transition-colors ${
              rule.isActive ? "border-outline-variant" : "border-outline-variant/40 opacity-60"
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleEnabled(rule)}
                aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${rule.isActive ? "bg-primary" : "bg-outline-variant"}`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.isActive ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
              <input
                value={rule.name}
                onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                className={`${inputCls} flex-1 font-medium`}
                aria-label="Rule name"
              />
              <button
                onClick={() => removeRule(rule.id)}
                aria-label="Delete rule"
                className="p-1.5 rounded text-error/60 hover:text-error hover:bg-error/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                  When
                </label>
                <div className="relative">
                  <select
                    value={rule.condition}
                    onChange={(e) => updateRule(rule.id, { condition: e.target.value as EscalationCondition })}
                    className={`${inputCls} w-full appearance-none pr-7`}
                    aria-label="Trigger condition"
                  >
                    {(Object.keys(CONDITION_LABELS) as EscalationCondition[]).map((c) => (
                      <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
                </div>
              </div>

              {(rule.condition === "breach_imminent" || rule.condition === "no_response") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                    Threshold (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rule.thresholdMinutes}
                    onChange={(e) => updateRule(rule.id, { thresholdMinutes: parseInt(e.target.value) || 0 })}
                    className={`${inputCls} w-full`}
                    aria-label="Threshold in minutes"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                Then do
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACTION_LABELS) as EscalationAction[]).map((action) => {
                  const active = rule.actions.some((a) => a.type === action);
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => toggleAction(rule.id, action)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                        active
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : "bg-transparent border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary/70"
                      }`}
                    >
                      {ACTION_LABELS[action].icon}
                      {ACTION_LABELS[action].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {rules.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={createMut.isPending || updateMut.isPending || !rules.some((r) => r.dirty)}
            loading={createMut.isPending || updateMut.isPending}
          >
            Save rules
          </Button>
        </div>
      )}
    </div>
  );
}

function SlaPage() {
  const { tab = "policies" } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[15px] font-semibold text-on-surface">SLA</h1>
        <div className="flex items-center gap-1 bg-surface-container border border-outline-variant rounded-lg p-0.5">
          {[
            { key: "policies", label: "Policies" },
            { key: "breach", label: "Breach Dashboard" },
            { key: "hours", label: "Business Hours" },
            { key: "escalation", label: "Escalation Rules" },
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

      {activeTab === "policies" && <SlaTable />}
      {activeTab === "breach" && <SlaBreachDashboard />}
      {activeTab === "hours" && <BusinessHoursEditor />}
      {activeTab === "escalation" && <EscalationRuleBuilder />}
    </div>
  );
}
