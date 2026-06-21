import { createFileRoute } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Zap, Edit2, Trash2, Copy, X } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useAppStore } from "@/store";
import { FieldValueInput } from "@/lib/fieldOptions";
import { Button, Input } from "@/components/ui";

function getHeaders() {
  const { accessToken, tenantId } = useAppStore.getState();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "X-Tenant-ID": tenantId ?? "",
  };
}

async function fetchMacros(): Promise<Macro[]> {
  const res = await authFetch("/api/macros", { headers: getHeaders() });
  const json = await res.json();
  return (json?.data ?? []) as Macro[];
}

export const Route = createFileRoute("/_auth/macros")({
  component: MacrosPage,
});

type Macro = {
  id: string;
  name: string;
  description?: string;
  actions: MacroAction[];
  isActive?: boolean;
};

type MacroAction =
  | { type: "set_status"; value: string }
  | { type: "set_priority"; value: string }
  | { type: "add_tag"; value: string }
  | { type: "send_reply"; value: string }
  | { type: "add_note"; value: string };

const ACTION_LABELS: Record<string, string> = {
  set_status: "Set status",
  set_priority: "Set priority",
  add_tag: "Add tag",
  send_reply: "Send reply",
  add_note: "Add internal note",
};


function ActionChip({ action }: { action: MacroAction }) {
  const colors: Record<string, string> = {
    set_status: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    set_priority: "bg-orange-500/10 text-orange-300 border-orange-500/20",
    add_tag: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    send_reply: "bg-primary/10 text-primary border-primary/20",
    add_note: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${colors[action.type]}`}>
      {ACTION_LABELS[action.type]}{action.value ? `: ${action.value.slice(0, 20)}${action.value.length > 20 ? "…" : ""}` : ""}
    </span>
  );
}

function MacroFormModal({ macro, onSave, onClose }: {
  macro?: Macro;
  onSave: (m: Omit<Macro, "id">) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(macro?.name ?? "");
  const [description, setDescription] = useState(macro?.description ?? "");
  const [actions, setActions] = useState<MacroAction[]>(macro?.actions ?? []);
  const [newActionType, setNewActionType] = useState("set_status");
  const [newActionValue, setNewActionValue] = useState("");

  const addAction = () => {
    if (!newActionValue.trim()) return;
    setActions((prev) => [...prev, { type: newActionType, value: newActionValue } as MacroAction]);
    setNewActionValue("");
  };

  const removeAction = (i: number) => setActions((prev) => prev.filter((_, j) => j !== i));

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim() || undefined, actions });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">{macro ? "Edit macro" : "New macro"}</h3>
          <button onClick={onClose} className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Input dense value={name} onChange={(e) => setName(e.target.value)} placeholder="Macro name" autoFocus />
          <Input dense value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" />
        </div>

        {/* Actions list */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-on-surface">Actions ({actions.length})</p>
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <ActionChip action={a} />
              <button onClick={() => removeAction(i)} className="ml-auto text-on-surface-variant/30 hover:text-error transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {actions.length === 0 && (
            <p className="text-[11px] text-on-surface-variant/40">No actions yet</p>
          )}
        </div>

        {/* Add action */}
        <div className="flex gap-2">
          <select
            value={newActionType}
            onChange={(e) => setNewActionType(e.target.value)}
            className="px-2.5 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none transition-colors"
          >
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex-1 min-w-0">
            <FieldValueInput
              optionKey={newActionType}
              value={newActionValue}
              onChange={setNewActionValue}
              onKeyDown={(e) => e.key === "Enter" && addAction()}
              placeholder="Value…"
              ariaLabel="Action value"
              wrapperClassName="relative w-full"
              inputClassName="w-full px-2.5 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              selectClassName="w-full appearance-none pr-6 px-2.5 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
          </div>
          <button onClick={addAction} className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-xs font-medium">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>{macro ? "Save changes" : "Create macro"}</Button>
        </div>
      </div>
    </div>
  );
}

function MacrosPage() {
  const qc = useQueryClient();
  const { success, error: showError } = useToast();
  const [editing, setEditing] = useState<Macro | "new" | null>(null);

  const { data: macros = [], isLoading } = useQuery({ queryKey: ["macros"], queryFn: fetchMacros });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<Macro, "id">) => {
      const res = await authFetch("/api/macros", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["macros"] }); success("Macro created"); setEditing(null); },
    onError: (e: any) => showError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Omit<Macro, "id"> }) => {
      const res = await authFetch(`/api/macros/${id}`, { method: "PUT", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["macros"] }); success("Macro saved"); setEditing(null); },
    onError: (e: any) => showError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/macros/${id}`, { method: "DELETE", headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["macros"] }); success("Macro deleted"); },
    onError: (e: any) => showError(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await authFetch(`/api/macros/${id}/duplicate`, { method: "POST", headers: getHeaders() });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["macros"] }); success("Macro duplicated"); },
    onError: (e: any) => showError(e.message),
  });

  const handleSave = (data: Omit<Macro, "id">) => {
    if (editing === "new") {
      createMutation.mutate(data);
    } else if (editing && typeof editing === "object") {
      updateMutation.mutate({ id: editing.id, data });
    }
  };

  return (
    <div className="space-y-4">
      {editing && (
        <MacroFormModal
          macro={editing === "new" ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface">Macros</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Automate repetitive ticket actions with one click.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="w-3.5 h-3.5" />
          New macro
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-on-surface-variant/40">Loading…</div>
        ) : macros.length === 0 ? (
          <div className="p-12 text-center">
            <Zap className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-on-surface">No macros yet</p>
            <p className="text-xs text-on-surface-variant/40 mt-1">Create macros to automate common workflows</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {macros.map((m) => (
              <div key={m.id} className="px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-white/3 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-sm font-medium text-on-surface">{m.name}</p>
                  </div>
                  {m.description && (
                    <p className="text-xs text-on-surface-variant/60 mb-2">{m.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(m.actions ?? []).map((a, i) => <ActionChip key={i} action={a} />)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => duplicateMutation.mutate(m.id)} className="p-1.5 text-on-surface-variant/40 hover:text-on-surface rounded transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditing(m)} className="p-1.5 text-on-surface-variant/40 hover:text-on-surface rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(m.id)} className="p-1.5 text-on-surface-variant/40 hover:text-error rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
