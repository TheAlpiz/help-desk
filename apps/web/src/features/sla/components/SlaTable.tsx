import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Timer, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";
import { createSlaSchema, updateSlaSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

const PRIORITY_VALUES = ["", "low", "medium", "high", "critical"] as const;
const priorityLabel = (t: TFunction, v: string) => (v ? t(`priorities.${v}`) : t("priorities.any"));

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
  medium: "text-blue-300 bg-blue-500/10 border-blue-500/20",
  high: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  critical: "text-red-300 bg-red-500/10 border-red-500/20",
};

type Department = { id: string; name: string };

function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments-flat"],
    queryFn: async () => {
      const res = await api.departments.index.$get();
      const body = await res.json() as any;
      const raw = body?.data ?? body ?? [];
      return Array.isArray(raw) ? raw : [];
    },
  });
}

const selectCls =
  "px-2.5 py-1.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors appearance-none pr-7 w-full";

function SelectField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-on-surface">{label}</label>
      <div className="relative">
        {children}
        <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
      </div>
    </div>
  );
}

type SlaPolicy = {
  id: string;
  organizationId: string;
  name: string;
  firstResponseTimeMins: number;
  resolutionTimeMins: number;
  departmentId: string | null;
  priority: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};


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

function formatMins(t: TFunction, mins: number): string {
  if (mins < 60) return t("duration.min", { count: mins });
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? t("duration.hoursMins", { hours: h, mins: m }) : t("duration.hours", { count: h });
}

function CreateSlaModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("sla");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: departments = [] } = useDepartments();

  const form = useForm({
    defaultValues: {
      name: "",
      firstResponseTimeMins: 60,
      resolutionTimeMins: 480,
      departmentId: null as string | null,
      priority: null as string | null,
    },
    validators: { onChange: createSlaSchema as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const payload = { ...value, departmentId: value.departmentId || null, priority: (value.priority || null) as any };
        const res = await api.slas.index.$post({ json: payload });
        const body = await res.json() as any;
        if (!res.ok) { setError(body?.error?.message || body?.message || t("modal.errors.createFailed")); return; }
        queryClient.invalidateQueries({ queryKey: ["sla"] });
        onClose();
      } catch (err: any) { setError(err.message || t("modal.errors.generic")); }
    },
  });

  return (
    <ModalShell title={t("modal.createTitle")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field name="name" validators={{ onChange: z.string().min(1, t("modal.errors.nameRequired")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("modal.policyName")}</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder={t("modal.policyNamePlaceholder")} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstResponseTimeMins" validators={{ onChange: z.number().int().min(1, t("modal.errors.minMinute")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("modal.firstResponseMin")}</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="resolutionTimeMins" validators={{ onChange: z.number().int().min(1, t("modal.errors.minMinute")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("modal.resolutionMin")}</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="departmentId" children={(field) => (
            <SelectField label={t("modal.departmentOptional")}>
              <select className={selectCls} value={field.state.value ?? ""} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value || null)}>
                <option value="">{t("modal.anyDepartment")}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </SelectField>
          )} />
          <form.Field name="priority" children={(field) => (
            <SelectField label={t("modal.priorityOptional")}>
              <select className={selectCls} value={field.state.value ?? ""} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value || null)}>
                {PRIORITY_VALUES.map((v) => <option key={v} value={v}>{priorityLabel(t, v)}</option>)}
              </select>
            </SelectField>
          )} />
        </div>

        <p className="text-xs text-on-surface-variant/40">{t("modal.catchAllHint")}</p>

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{t("modal.cancel")}</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && t("modal.createPolicy")}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function EditSlaModal({ sla, onClose }: { sla: SlaPolicy; onClose: () => void }) {
  const { t } = useTranslation("sla");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: departments = [] } = useDepartments();

  const form = useForm({
    defaultValues: {
      name: sla.name,
      firstResponseTimeMins: sla.firstResponseTimeMins,
      resolutionTimeMins: sla.resolutionTimeMins,
      departmentId: sla.departmentId,
      priority: sla.priority,
      isActive: sla.isActive,
    },
    validators: { onChange: updateSlaSchema.omit({ businessHoursConfig: true }) as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const payload = { ...value, departmentId: value.departmentId || null, priority: (value.priority || null) as any };
        const res = await api.slas[":id"].$put({ param: { id: sla.id }, json: payload });
        const body = await res.json() as any;
        if (!res.ok) { setError(body?.error?.message || body?.message || t("modal.errors.updateFailed")); return; }
        queryClient.invalidateQueries({ queryKey: ["sla"] });
        onClose();
      } catch (err: any) { setError(err.message || t("modal.errors.generic")); }
    },
  });

  return (
    <ModalShell title={t("modal.editTitle")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>

        <form.Field name="name" validators={{ onChange: z.string().min(1, t("modal.errors.nameRequired")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("modal.policyName")}</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="firstResponseTimeMins" validators={{ onChange: z.number().int().min(1, t("modal.errors.minMinute")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("modal.firstResponseMin")}</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
          <form.Field name="resolutionTimeMins" validators={{ onChange: z.number().int().min(1, t("modal.errors.minMinute")) }} children={(field) => (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">{t("modal.resolutionMin")}</label>
              <Input dense type="number" min={1} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(Number(e.target.value))} />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </div>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <form.Field name="departmentId" children={(field) => (
            <SelectField label={t("modal.departmentOptional")}>
              <select className={selectCls} value={field.state.value ?? ""} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value || null)}>
                <option value="">{t("modal.anyDepartment")}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </SelectField>
          )} />
          <form.Field name="priority" children={(field) => (
            <SelectField label={t("modal.priorityOptional")}>
              <select className={selectCls} value={field.state.value ?? ""} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value || null)}>
                {PRIORITY_VALUES.map((v) => <option key={v} value={v}>{priorityLabel(t, v)}</option>)}
              </select>
            </SelectField>
          )} />
        </div>

        <form.Field name="isActive" children={(field) => (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={field.state.value} onChange={(e) => field.handleChange(e.target.checked)} className="w-4 h-4 rounded accent-primary" />
            <span className="text-sm text-on-surface">{t("modal.activePolicy")}</span>
          </label>
        )} />

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{t("modal.cancel")}</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && t("modal.saveChanges")}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteSlaConfirm({ sla, onClose }: { sla: SlaPolicy; onClose: () => void }) {
  const { t } = useTranslation("sla");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.slas[":id"].$delete({ param: { id: sla.id } });
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error?.message || body?.message || t("modal.errors.deleteFailed"));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sla"] }); onClose(); },
  });

  return (
    <ModalShell title={t("modal.deleteTitle")} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">{t("modal.deleteConfirmPre")} <span className="font-semibold text-on-surface">{sla.name}</span>{t("modal.deleteConfirmPost")}</p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t("modal.cancel")}</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && t("modal.delete")}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

export function SlaTable() {
  const { t } = useTranslation("sla");
  const [showCreate, setShowCreate] = useState(false);
  const [editSla, setEditSla] = useState<SlaPolicy | null>(null);
  const [deleteSla, setDeleteSla] = useState<SlaPolicy | null>(null);
  const { data: departments = [] } = useDepartments();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["sla"],
    queryFn: async () => {
      const res = await api.slas.index.$get();
      const body = await res.json() as any;
      return body as { data: SlaPolicy[] };
    },
  });

  const slas: SlaPolicy[] = response?.data ?? [];
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  return (
    <>
      {showCreate && <CreateSlaModal onClose={() => setShowCreate(false)} />}
      {editSla && <EditSlaModal sla={editSla} onClose={() => setEditSla(null)} />}
      {deleteSla && <DeleteSlaConfirm sla={deleteSla} onClose={() => setDeleteSla(null)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">{t("table.intro")}</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          {t("table.newPolicy")}
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">{t("table.loadError")}</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.policyName")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.firstResponse")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.resolution")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.department")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.priority")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.status")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {slas.map((sla) => (
                <tr key={sla.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{sla.name}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{formatMins(t, sla.firstResponseTimeMins)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{formatMins(t, sla.resolutionTimeMins)}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">
                    {sla.departmentId ? deptMap.get(sla.departmentId) ?? sla.departmentId.slice(0, 8) : <span className="text-on-surface-variant/30">{t("table.any")}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {sla.priority ? (
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${PRIORITY_COLORS[sla.priority] ?? "bg-white/8 text-on-surface-variant border-white/10"}`}>
                        {priorityLabel(t, sla.priority)}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/30 text-sm">{t("table.any")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${sla.isActive ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant border-white/10"}`}>
                      {sla.isActive ? t("table.active") : t("table.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditSla(sla)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title={t("table.edit")}><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteSla(sla)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title={t("table.delete")}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {slas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Timer className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">{t("table.emptyTitle")}</p>
                      <button onClick={() => setShowCreate(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">{t("table.createFirst")}</button>
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
