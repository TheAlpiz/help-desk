import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authFetch } from "@/lib/api";
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

type Op = "eq" | "neq" | "in" | "nin";
type ConditionField = "mailboxId" | "ticketPriority" | "departmentId" | "agentId";

interface Condition {
  field: ConditionField;
  op: Op;
  value: string | string[];
}

interface SignatureRule {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  conditions: Condition[];
  signatureId: string;
  isActive: boolean;
  createdAt: string;
}

interface Signature {
  id: string;
  name: string;
  ownerType: string;
}

const FIELD_LABELS: Record<ConditionField, string> = {
  mailboxId: "Mailbox",
  ticketPriority: "Ticket Priority",
  departmentId: "Department",
  agentId: "Agent",
};

const OP_LABELS: Record<Op, string> = {
  eq: "is",
  neq: "is not",
  in: "is one of",
  nin: "is not one of",
};

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"];

function ConditionRow({
  cond,
  index,
  onChange,
  onRemove,
}: {
  cond: Condition;
  index: number;
  onChange: (c: Condition) => void;
  onRemove: () => void;
}) {
  const multiValue = cond.op === "in" || cond.op === "nin";
  const valStr = Array.isArray(cond.value) ? cond.value.join(", ") : cond.value;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={cond.field}
        onChange={(e) => onChange({ ...cond, field: e.target.value as ConditionField })}
        className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
      >
        {(Object.keys(FIELD_LABELS) as ConditionField[]).map((f) => (
          <option key={f} value={f}>
            {FIELD_LABELS[f]}
          </option>
        ))}
      </select>

      <select
        value={cond.op}
        onChange={(e) => onChange({ ...cond, op: e.target.value as Op })}
        className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
      >
        {(Object.keys(OP_LABELS) as Op[]).map((op) => (
          <option key={op} value={op}>
            {OP_LABELS[op]}
          </option>
        ))}
      </select>

      {cond.field === "ticketPriority" ? (
        multiValue ? (
          <div className="flex gap-1 flex-wrap">
            {PRIORITY_OPTIONS.map((p) => {
              const vals = Array.isArray(cond.value) ? cond.value : [];
              const checked = vals.includes(p);
              return (
                <label key={p} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? vals.filter((v) => v !== p) : [...vals, p];
                      onChange({ ...cond, value: next });
                    }}
                    className="w-3 h-3"
                  />
                  <span className="text-xs">{p}</span>
                </label>
              );
            })}
          </div>
        ) : (
          <select
            value={valStr}
            onChange={(e) => onChange({ ...cond, value: e.target.value })}
            className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )
      ) : (
        <input
          type="text"
          value={valStr}
          onChange={(e) =>
            onChange({
              ...cond,
              value: multiValue ? e.target.value.split(",").map((v) => v.trim()) : e.target.value,
            })
          }
          placeholder={multiValue ? "value1, value2..." : "value"}
          className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs w-40"
        />
      )}

      <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center text-error hover:bg-error/10 rounded transition-colors">
        ×
      </button>
    </div>
  );
}

function RuleCard({
  rule,
  signatures,
  onToggle,
  onDelete,
}: {
  rule: SignatureRule;
  signatures: Signature[];
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sig = signatures.find((s) => s.id === rule.signatureId);

  return (
    <div className={`bg-surface border rounded-xl transition-colors ${rule.isActive ? "border-outline-variant" : "border-outline-variant/50 opacity-60"}`}>
      <div className="flex items-center gap-3 p-4">
        <GripVertical className="w-4 h-4 text-on-surface-variant/40 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-on-surface">{rule.name}</span>
            <span className="text-xs px-1.5 py-0.5 bg-surface-container rounded text-on-surface-variant">
              P{rule.priority}
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} →{" "}
            <span className="text-primary">{sig?.name ?? rule.signatureId}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onToggle} className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded transition-colors">
            {rule.isActive ? (
              <ToggleRight className="w-5 h-5 text-primary" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
          </button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center text-error hover:bg-error/10 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-outline-variant pt-3 space-y-2">
          {rule.conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-1 text-xs text-on-surface-variant">
              <span className="font-medium text-on-surface">{FIELD_LABELS[cond.field]}</span>
              <span>{OP_LABELS[cond.op]}</span>
              <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">
                {Array.isArray(cond.value) ? cond.value.join(", ") : cond.value}
              </span>
            </div>
          ))}
          {rule.description && (
            <p className="text-xs text-on-surface-variant mt-2 italic">{rule.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

const BLANK_RULE: {
  name: string;
  description: string;
  priority: number;
  conditions: Condition[];
  signatureId: string;
} = {
  name: "",
  description: "",
  priority: 0,
  conditions: [{ field: "ticketPriority", op: "eq", value: "High" }],
  signatureId: "",
};

export function SignatureRules() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...BLANK_RULE });

  const { data: rulesData } = useQuery({
    queryKey: ["signature-rules"],
    queryFn: () => authFetch("/api/email/signature-rules").then((r) => r.json()),
  });

  const { data: sigsData } = useQuery({
    queryKey: ["email-signatures"],
    queryFn: () => authFetch("/api/email/signatures").then((r) => r.json()),
  });

  const rules: SignatureRule[] = rulesData?.data ?? [];
  const signatures: Signature[] = sigsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: typeof BLANK_RULE) =>
      authFetch("/api/email/signature-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature-rules"] });
      setCreating(false);
      setDraft({ ...BLANK_RULE });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SignatureRule> }) =>
      authFetch(`/api/email/signature-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signature-rules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/email/signature-rules/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signature-rules"] }),
  });

  const setCondition = (i: number, cond: Condition) => {
    const next = [...draft.conditions];
    next[i] = cond;
    setDraft({ ...draft, conditions: next });
  };

  const removeCondition = (i: number) => {
    setDraft({ ...draft, conditions: draft.conditions.filter((_, idx) => idx !== i) });
  };

  const addCondition = () => {
    setDraft({
      ...draft,
      conditions: [...draft.conditions, { field: "mailboxId", op: "eq", value: "" }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">Signature Rules</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Rules override the default 3-tier fallback. Evaluated in priority order (lowest first).
          </p>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
      </div>

      {/* Rule creation form */}
      {creating && (
        <div className="bg-surface border border-primary rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-semibold text-on-surface">New Rule</h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Name</label>
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
                placeholder="e.g. Critical tickets"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Priority</label>
              <input
                type="number"
                value={draft.priority}
                onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-2">Conditions (ALL must match)</label>
            <div className="space-y-2">
              {draft.conditions.map((cond, i) => (
                <ConditionRow
                  key={i}
                  cond={cond}
                  index={i}
                  onChange={(c) => setCondition(i, c)}
                  onRemove={() => removeCondition(i)}
                />
              ))}
            </div>
            <button
              onClick={addCondition}
              className="mt-2 text-xs text-primary hover:underline"
            >
              + Add condition
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Use Signature</label>
            <select
              value={draft.signatureId}
              onChange={(e) => setDraft({ ...draft, signatureId: e.target.value })}
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
            >
              <option value="">— select signature —</option>
              {signatures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.ownerType.toLowerCase()})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate(draft)}
              disabled={!draft.name || !draft.signatureId || createMutation.isPending}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </button>
            <button
              onClick={() => { setCreating(false); setDraft({ ...BLANK_RULE }); }}
              className="px-4 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface hover:bg-surface-container-high transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rule list */}
      {rules.length === 0 && !creating ? (
        <div className="py-10 text-center text-sm text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
          No signature rules. Rules take precedence over the default 3-tier fallback.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              signatures={signatures}
              onToggle={() => updateMutation.mutate({ id: rule.id, data: { isActive: !rule.isActive } })}
              onDelete={() => deleteMutation.mutate(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
