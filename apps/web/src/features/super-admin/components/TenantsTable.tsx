import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Building2, Users, CheckCircle, ExternalLink, Flag, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";
import { useTranslation } from "react-i18next";

type Tenant = {
  id: string;
  name: string;
  domain: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string | null;
  updatedAt: string | null;
};


const STATUS_CLS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  inactive: "bg-white/8 text-on-surface-variant border-white/10",
  suspended: "bg-error-container/20 text-error border-error/20",
};

function ModalShell({ title, subtitle, onClose, children, wide }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
            {subtitle && <p className="text-xs text-on-surface-variant/60 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors mt-0.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Provision Wizard ─────────────────────────────────────────────────────────

type WizardData = {
  orgName: string;
  orgDomain: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  adminPassword: string;
};

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useTranslation("tenants");
  const steps = [
    { n: 1, label: t("provision.steps.org") },
    { n: 2, label: t("provision.steps.admin") },
    { n: 3, label: t("provision.steps.review") },
  ];
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-outline-variant bg-surface-container-low">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s.n ? "bg-primary text-on-primary" : step > s.n ? "bg-emerald-500/20 text-emerald-300" : "bg-surface-container-high text-on-surface-variant/40"}`}>
            {step > s.n ? "✓" : s.n}
          </div>
          <span className={`text-xs font-medium ${step === s.n ? "text-primary" : step > s.n ? "text-on-surface-variant/60" : "text-on-surface-variant/30"}`}>{s.label}</span>
          {i < steps.length - 1 && <span className="text-on-surface-variant/20 mx-1 text-xs">→</span>}
        </div>
      ))}
    </div>
  );
}

function ProvisionTenantModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("tenants");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<WizardData>({ orgName: "", orgDomain: "", adminEmail: "", adminFirstName: "", adminLastName: "", adminPassword: "" });
  const [error, setError] = useState<string | null>(null);

  const req = t("provision.validation.required");
  const inv = t("provision.validation.invalidEmail");
  const min8 = t("provision.validation.minPassword");

  const orgForm = useForm({
    defaultValues: { name: data.orgName, domain: data.orgDomain },
    validators: { onChange: z.object({ name: z.string().min(1, req), domain: z.string().min(1, req) }) },
    onSubmit: async ({ value }) => { setData((d) => ({ ...d, orgName: value.name, orgDomain: value.domain })); setStep(2); },
  });

  const adminForm = useForm({
    defaultValues: { email: data.adminEmail, firstName: data.adminFirstName, lastName: data.adminLastName, password: data.adminPassword },
    validators: { onChange: z.object({ email: z.string().email(inv), firstName: z.string().min(1, req), lastName: z.string().min(1, req), password: z.string().min(8, min8) }) },
    onSubmit: async ({ value }) => { setData((d) => ({ ...d, adminEmail: value.email, adminFirstName: value.firstName, adminLastName: value.lastName, adminPassword: value.password })); setStep(3); },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.organizations.provision.$post({
        json: {
          org: { name: data.orgName, domain: data.orgDomain },
          admin: {
            firstName: data.adminFirstName,
            lastName: data.adminLastName,
            email: data.adminEmail,
            password: data.adminPassword,
          },
        },
      });
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error?.message || body?.message || t("provision.errors.failed"));
      return body.data.organization;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-sm font-semibold text-on-surface">{t("provision.title")}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <StepIndicator step={step} />

        <div className="flex-1 overflow-y-auto p-5">
          <FormAlert className="mb-4">{error ?? undefined}</FormAlert>

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); orgForm.handleSubmit(); }} className="space-y-4">
              <orgForm.Field name="name" validators={{ onChange: z.string().min(1, req) }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">{t("provision.org.nameLabel")}</label>
                  <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder={t("provision.org.namePlaceholder")} />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <orgForm.Field name="domain" validators={{ onChange: z.string().min(1, req) }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">{t("provision.org.domainLabel")}</label>
                  <div className="flex rounded-lg overflow-hidden border border-outline-variant focus-within:ring-2 focus-within:ring-primary/50 transition-colors">
                    <span className="inline-flex items-center px-3 bg-surface-container-high border-r border-outline-variant text-on-surface-variant text-xs shrink-0">https://</span>
                    <input className="flex-1 px-3 py-2 bg-surface-container-high text-sm text-on-surface focus:outline-none" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder={t("provision.org.domainPlaceholder")} />
                  </div>
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <div className="flex justify-end pt-1">
                <orgForm.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
                  <Button type="submit" disabled={!canSubmit}>{t("provision.org.nextBtn")}</Button>
                )} />
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); adminForm.handleSubmit(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <adminForm.Field name="firstName" validators={{ onChange: z.string().min(1, req) }} children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface">{t("provision.admin.firstNameLabel")}</label>
                    <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )} />
                <adminForm.Field name="lastName" validators={{ onChange: z.string().min(1, req) }} children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface">{t("provision.admin.lastNameLabel")}</label>
                    <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )} />
              </div>
              <adminForm.Field name="email" validators={{ onChange: z.string().email(inv) }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">{t("provision.admin.emailLabel")}</label>
                  <Input dense type="email" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder={t("provision.admin.emailPlaceholder")} />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <adminForm.Field name="password" validators={{ onChange: z.string().min(8, min8) }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">{t("provision.admin.passwordLabel")}</label>
                  <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <div className="flex gap-2 justify-between pt-1">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>{t("provision.admin.backBtn")}</Button>
                <adminForm.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
                  <Button type="submit" disabled={!canSubmit}>{t("provision.admin.nextBtn")}</Button>
                )} />
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("provision.review.orgSection")}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-on-surface-variant/60">{t("provision.review.nameField")}</span><span className="text-on-surface font-medium">{data.orgName}</span>
                  <span className="text-on-surface-variant/60">{t("provision.review.domainField")}</span><span className="text-on-surface font-medium">{data.orgDomain}</span>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("provision.review.adminSection")}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-on-surface-variant/60">{t("provision.review.nameField")}</span><span className="text-on-surface font-medium">{data.adminFirstName} {data.adminLastName}</span>
                  <span className="text-on-surface-variant/60">{t("provision.review.emailField")}</span><span className="text-on-surface font-medium">{data.adminEmail}</span>
                  <span className="text-on-surface-variant/60">{t("provision.review.roleField")}</span><span className="text-on-surface font-medium">ADMIN</span>
                </div>
              </div>
              <div className="flex gap-2 justify-between pt-1">
                <Button variant="secondary" onClick={() => setStep(2)}>{t("provision.review.backBtn")}</Button>
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
                  {!mutation.isPending && t("provision.review.createBtn")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditTenantModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { t } = useTranslation("tenants");
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: tenant.name, domain: tenant.domain, status: tenant.status },
    validators: { onChange: z.object({ name: z.string().min(1), domain: z.string().min(1), status: z.enum(["active", "suspended"]) }) },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const res = await api.organizations[":id"].$put({ param: { id: tenant.id }, json: value as any });
        const body = await res.json() as any;
        if (!res.ok) { setError(body?.error?.message || body?.message || t("edit.errors.failed")); return; }
        queryClient.invalidateQueries({ queryKey: ["tenants"] });
        onClose();
      } catch (err: any) { setError(err.message || t("edit.errors.generic")); }
    },
  });

  const selectCls = "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

  return (
    <ModalShell title={t("edit.title")} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>
        <form.Field name="name" validators={{ onChange: z.string().min(1, t("provision.validation.required")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("edit.nameLabel")}</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />
        <form.Field name="domain" validators={{ onChange: z.string().min(1, t("provision.validation.required")) }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("edit.domainLabel")}</label>
            <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />
        <form.Field name="status" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">{t("edit.statusLabel")}</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value as Tenant["status"])}>
              <option value="active">{t("status.active")}</option>
              <option value="inactive">{t("status.inactive")}</option>
              <option value="suspended">{t("status.suspended")}</option>
            </select>
          </div>
        )} />
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>{t("edit.cancelBtn")}</Button>
          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]} children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
              {!isSubmitting && t("edit.saveBtn")}
            </Button>
          )} />
        </div>
      </form>
    </ModalShell>
  );
}

function DeleteTenantModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { t } = useTranslation("tenants");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.organizations[":id"].$delete({ param: { id: tenant.id } });
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
  });

  return (
    <ModalShell title={t("delete.title")} onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          {t("delete.confirm", { name: tenant.name })}
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>{t("delete.cancelBtn")}</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && t("delete.deleteBtn")}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

const FLAG_KEYS = ["whatsapp", "api_tokens", "sla_escalation", "custom_domains", "data_export", "sso", "ai_assist"] as const;
type FlagKey = typeof FLAG_KEYS[number];

function FeatureFlagsDrawer({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { t } = useTranslation("tenants");
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>(() =>
    Object.fromEntries(FLAG_KEYS.map((k) => [k, false])) as Record<FlagKey, boolean>
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await (api.organizations[":id"] as any)["feature-flags"].$put({
        param: { id: tenant.id },
        json: { flags },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-primary" /> {t("flags.title")}</h3>
            <p className="text-xs text-on-surface-variant/50 mt-0.5">{tenant.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant/40 hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {FLAG_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-on-surface">{t(`flags.items.${key}.label`)}</p>
                <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{t(`flags.items.${key}.description`)}</p>
              </div>
              <button
                onClick={() => setFlags((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`shrink-0 transition-colors ${flags[key] ? "text-emerald-400" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"}`}
                aria-label={t("flags.toggle", { label: t(`flags.items.${key}.label`) })}
              >
                {flags[key] ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-outline-variant">
          <Button fullWidth onClick={save} disabled={saving} loading={saving}>
            {!saving && (saved ? t("flags.savedBtn") : t("flags.saveBtn"))}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TenantsTable() {
  const { t } = useTranslation("tenants");
  const [showProvision, setShowProvision] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [flagTenant, setFlagTenant] = useState<Tenant | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const res = await api.organizations.index.$get();
      const body = await res.json() as any;
      return body as { data: Tenant[] };
    },
  });

  const tenants: Tenant[] = response?.data ?? [];
  const activeCount = tenants.filter((t) => t.status === "active").length;
  const inactiveCount = tenants.filter((t) => t.status !== "active").length;

  return (
    <>
      {showProvision && <ProvisionTenantModal onClose={() => setShowProvision(false)} />}
      {editTenant && <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} />}
      {deleteTenant && <DeleteTenantModal tenant={deleteTenant} onClose={() => setDeleteTenant(null)} />}
      {flagTenant && <FeatureFlagsDrawer tenant={flagTenant} onClose={() => setFlagTenant(null)} />}

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { labelKey: "stats.total" as const, value: tenants.length, icon: <Building2 className="w-4 h-4" />, accent: "text-primary" },
          { labelKey: "stats.active" as const, value: activeCount, icon: <CheckCircle className="w-4 h-4" />, accent: "text-emerald-300" },
          { labelKey: "stats.inactive" as const, value: inactiveCount, icon: <Users className="w-4 h-4" />, accent: "text-on-surface-variant" },
        ].map((s) => (
          <div key={s.labelKey} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ${s.accent}`}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${s.accent}`}>{isLoading ? "—" : s.value}</p>
              <p className="text-[11px] text-on-surface-variant/50">{t(s.labelKey)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">{t("subtitle")}</p>
        <Button onClick={() => setShowProvision(true)}>
          <Plus className="w-4 h-4" />
          {t("provisionBtn")}
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">{t("error.load")}</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.organization")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">{t("table.domain")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("table.status")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden lg:table-cell">{t("table.created")}</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{tenant.name[0]}</span>
                      </div>
                      <Link
                        to="/tenant/$tenantId"
                        params={{ tenantId: tenant.id }}
                        className="text-sm font-medium text-on-surface hover:text-primary transition-colors flex items-center gap-1 group"
                      >
                        {tenant.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden md:table-cell">{tenant.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_CLS[tenant.status] ?? "bg-white/8 text-on-surface-variant border-white/10"}`}>
                      {t(`status.${tenant.status}` as any)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden lg:table-cell">
                    {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setFlagTenant(tenant)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors" title={t("actions.featureFlags")}><Flag className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditTenant(tenant)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title={t("actions.edit")}><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTenant(tenant)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title={t("actions.delete")}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">{t("empty.title")}</p>
                      <button onClick={() => setShowProvision(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">{t("empty.cta")}</button>
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
