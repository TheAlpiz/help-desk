import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Timer } from "lucide-react";
import { useAppStore } from "@/store";
import { createSlaSchema, updateSlaSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

type SlaPolicy = {
  id: string;
  organizationId: string;
  name: string;
  firstResponseTimeMins: number;
  resolutionTimeMins: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

function getAuthHeaders() {
  const state = useAppStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers ?? {}) } });
  const body = await res.json();
  return { res, body };
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function formatMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function CreateSlaModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", firstResponseTimeMins: 60, resolutionTimeMins: 480 },
    validators: { onChange: createSlaSchema.omit({ businessHoursConfig: true }) },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch("/slas", { method: "POST", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to create SLA policy"); return; }
        queryClient.invalidateQueries({ queryKey: ["sla"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="New SLA Policy" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field name="name" validators={{ onChange: z.string().min(1, "Name is required") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Policy Name *</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="e.g. Standard SLA" />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstResponseTimeMins" validators={{ onChange: z.number().int().min(1, "Min 1 minute") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">First Response (min) *</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="resolutionTimeMins" validators={{ onChange: z.number().int().min(1, "Min 1 minute") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Resolution (min) *</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <p className="text-xs text-on-surface-variant/40">Tip: 60 min = 1 hour. First response must be faster than resolution.</p>

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && "Create Policy"}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function EditSlaModal({ sla, onClose }: { sla: SlaPolicy; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: sla.name, firstResponseTimeMins: sla.firstResponseTimeMins, resolutionTimeMins: sla.resolutionTimeMins, isActive: sla.isActive },
    validators: { onChange: updateSlaSchema.omit({ businessHoursConfig: true }) },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch(`/slas/${sla.id}`, { method: "PUT", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to update SLA policy"); return; }
        queryClient.invalidateQueries({ queryKey: ["sla"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  return (
    <ModalShell title="Edit SLA Policy" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field name="name" validators={{ onChange: z.string().min(1, "Name is required") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Policy Name *</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstResponseTimeMins" validators={{ onChange: z.number().int().min(1, "Min 1 minute") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">First Response (min) *</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="resolutionTimeMins" validators={{ onChange: z.number().int().min(1, "Min 1 minute") }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">Resolution (min) *</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <form.Field name="isActive" children={(field) => (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm text-on-surface">Active policy</span>
          </label>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && "Save Changes"}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteSlaConfirm({ sla, onClose }: { sla: SlaPolicy; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/slas/${sla.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla"] }); onClose(); },
  });

  return (
    <ModalShell title="Delete SLA Policy" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">Delete <span className="font-semibold text-on-surface">{sla.name}</span>? Cannot be undone.</p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Delete"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function SlaTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editSla, setEditSla] = useState<SlaPolicy | null>(null);
  const [deleteSla, setDeleteSla] = useState<SlaPolicy | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["sla"],
    queryFn: async () => {
      const { body } = await apiFetch("/slas");
      return body as { data: SlaPolicy[] };
    },
  });

  const slas: SlaPolicy[] = response?.data ?? [];

  return (
    <>
      {showCreate && <CreateSlaModal onClose={() => setShowCreate(false)} />}
      {editSla && <EditSlaModal sla={editSla} onClose={() => setEditSla(null)} />}
      {deleteSla && <DeleteSlaConfirm sla={deleteSla} onClose={() => setDeleteSla(null)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">Define response and resolution time targets.</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Policy
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load SLA policies.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Policy Name</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">First Response</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Resolution</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {slas.map((sla) => (
                <tr key={sla.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{sla.name}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{formatMins(sla.firstResponseTimeMins)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{formatMins(sla.resolutionTimeMins)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${sla.isActive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant border-white/10"}`}>
                      {sla.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditSla(sla)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteSla(sla)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {slas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Timer className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">No SLA policies yet</p>
                      <button onClick={() => setShowCreate(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Create first policy</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
