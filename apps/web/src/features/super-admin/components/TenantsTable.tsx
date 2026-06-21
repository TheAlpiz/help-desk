import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Plus, X, Pencil, Trash2, Building2, Users, CheckCircle, ExternalLink, Flag, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAppStore } from "@/store";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

type Tenant = {
  id: string;
  name: string;
  domain: string;
  status: "active" | "inactive" | "suspended";
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
  const steps = [
    { n: 1, label: "Organization" },
    { n: 2, label: "Admin User" },
    { n: 3, label: "Review" },
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
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<WizardData>({ orgName: "", orgDomain: "", adminEmail: "", adminFirstName: "", adminLastName: "", adminPassword: "" });
  const [error, setError] = useState<string | null>(null);

  const orgForm = useForm({
    defaultValues: { name: data.orgName, domain: data.orgDomain },
    validators: { onChange: z.object({ name: z.string().min(1, "Required"), domain: z.string().min(1, "Required") }) },
    onSubmit: async ({ value }) => { setData((d) => ({ ...d, orgName: value.name, orgDomain: value.domain })); setStep(2); },
  });

  const adminForm = useForm({
    defaultValues: { email: data.adminEmail, firstName: data.adminFirstName, lastName: data.adminLastName, password: data.adminPassword },
    validators: { onChange: z.object({ email: z.string().email("Invalid email"), firstName: z.string().min(1, "Required"), lastName: z.string().min(1, "Required"), password: z.string().min(8, "Min 8 chars") }) },
    onSubmit: async ({ value }) => { setData((d) => ({ ...d, adminEmail: value.email, adminFirstName: value.firstName, adminLastName: value.lastName, adminPassword: value.password })); setStep(3); },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // Atomic: creates org + its first ADMIN user (in the NEW org) in one transaction.
      const { res, body } = await apiFetch("/organizations/provision", {
        method: "POST",
        body: JSON.stringify({
          org: { name: data.orgName, domain: data.orgDomain },
          admin: {
            firstName: data.adminFirstName,
            lastName: data.adminLastName,
            email: data.adminEmail,
            password: data.adminPassword,
          },
        }),
      });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to provision tenant");
      return body.data.organization;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <h3 className="text-sm font-semibold text-on-surface">Provision New Tenant</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <StepIndicator step={step} />

        <div className="flex-1 overflow-y-auto p-5">
          <FormAlert className="mb-4">{error ?? undefined}</FormAlert>

          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); orgForm.handleSubmit(); }} className="space-y-4">
              <orgForm.Field name="name" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Organization Name *</label>
                  <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Acme Corp" />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <orgForm.Field name="domain" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Domain *</label>
                  <div className="flex rounded-lg overflow-hidden border border-outline-variant focus-within:ring-2 focus-within:ring-primary/50 transition-colors">
                    <span className="inline-flex items-center px-3 bg-surface-container-high border-r border-outline-variant text-on-surface-variant text-xs shrink-0">https://</span>
                    <input className="flex-1 px-3 py-2 bg-surface-container-high text-sm text-on-surface focus:outline-none" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="acme.example.com" />
                  </div>
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <div className="flex justify-end pt-1">
                <orgForm.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
                  <Button type="submit" disabled={!canSubmit}>Next: Admin User →</Button>
                )} />
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); adminForm.handleSubmit(); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <adminForm.Field name="firstName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface">First Name *</label>
                    <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )} />
                <adminForm.Field name="lastName" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-on-surface">Last Name *</label>
                    <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                    <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                  </div>
                )} />
              </div>
              <adminForm.Field name="email" validators={{ onChange: z.string().email("Invalid email") }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Email *</label>
                  <Input dense type="email" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="admin@acme.com" />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <adminForm.Field name="password" validators={{ onChange: z.string().min(8, "Min 8 chars") }} children={(field) => (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-on-surface">Temporary Password *</label>
                  <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
                  <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
                </div>
              )} />
              <div className="flex gap-2 justify-between pt-1">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <adminForm.Subscribe selector={(s) => [s.canSubmit]} children={([canSubmit]) => (
                  <Button type="submit" disabled={!canSubmit}>Next: Review →</Button>
                )} />
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant/50 uppercase tracking-wider">Organization</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-on-surface-variant/60">Name</span><span className="text-on-surface font-medium">{data.orgName}</span>
                  <span className="text-on-surface-variant/60">Domain</span><span className="text-on-surface font-medium">{data.orgDomain}</span>
                </div>
              </div>
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant/50 uppercase tracking-wider">Admin User</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-on-surface-variant/60">Name</span><span className="text-on-surface font-medium">{data.adminFirstName} {data.adminLastName}</span>
                  <span className="text-on-surface-variant/60">Email</span><span className="text-on-surface font-medium">{data.adminEmail}</span>
                  <span className="text-on-surface-variant/60">Role</span><span className="text-on-surface font-medium">ADMIN</span>
                </div>
              </div>
              <div className="flex gap-2 justify-between pt-1">
                <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
                  {!mutation.isPending && "Create Tenant"}
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
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: tenant.name, domain: tenant.domain, status: tenant.status },
    validators: { onChange: z.object({ name: z.string().min(1), domain: z.string().min(1), status: z.enum(["active", "inactive", "suspended"]) }) },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const { res, body } = await apiFetch(`/organizations/${tenant.id}`, { method: "PUT", body: JSON.stringify(value) });
        if (!res.ok) { setError(body?.error?.message || body?.message || "Failed to update"); return; }
        queryClient.invalidateQueries({ queryKey: ["tenants"] });
        onClose();
      } catch (err: any) { setError(err.message || "An error occurred"); }
    },
  });

  const selectCls = "w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

  return (
    <ModalShell title="Edit Tenant" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }} className="p-5 space-y-4">
        <FormAlert>{error ?? undefined}</FormAlert>
        <form.Field name="name" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Organization Name</label>
            <Input dense autoFocus value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />
        <form.Field name="domain" validators={{ onChange: z.string().min(1, "Required") }} children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Domain</label>
            <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} />
            <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
          </div>
        )} />
        <form.Field name="status" children={(field) => (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Status</label>
            <select className={selectCls} value={field.state.value} onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value as Tenant["status"])}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
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

function DeleteTenantModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/organizations/${tenant.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tenants"] }); onClose(); },
  });

  return (
    <ModalShell title="Delete Tenant" onClose={onClose}>
      <div className="p-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Permanently delete <span className="font-semibold text-on-surface">{tenant.name}</span>? All data will be lost. Cannot be undone.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Delete Tenant"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

const DEFAULT_FLAGS = [
  { key: "whatsapp", label: "WhatsApp integration", description: "Enable WhatsApp channel for this tenant" },
  { key: "api_tokens", label: "API tokens", description: "Allow agents to create personal API tokens" },
  { key: "sla_escalation", label: "SLA escalation rules", description: "Advanced SLA escalation builder" },
  { key: "custom_domains", label: "Custom domains", description: "Allow tenant to set custom subdomain" },
  { key: "data_export", label: "Data export", description: "Enable bulk data export center" },
  { key: "sso", label: "SSO / SCIM", description: "Single sign-on and SCIM provisioning" },
  { key: "ai_assist", label: "AI assist (beta)", description: "AI-powered reply suggestions and triage" },
];

function FeatureFlagsDrawer({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DEFAULT_FLAGS.map((f) => [f.key, false]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch(`/organizations/${tenant.id}/feature-flags`, {
        method: "PUT",
        body: JSON.stringify({ flags }),
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
            <h3 className="text-sm font-semibold text-on-surface flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-primary" /> Feature Flags</h3>
            <p className="text-xs text-on-surface-variant/50 mt-0.5">{tenant.name}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant/40 hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {DEFAULT_FLAGS.map((f) => (
            <div key={f.key} className="flex items-start gap-3 p-3 bg-white/3 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-on-surface">{f.label}</p>
                <p className="text-[11px] text-on-surface-variant/50 mt-0.5">{f.description}</p>
              </div>
              <button
                onClick={() => setFlags((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                className={`shrink-0 transition-colors ${flags[f.key] ? "text-emerald-400" : "text-on-surface-variant/30 hover:text-on-surface-variant/60"}`}
                aria-label={`Toggle ${f.label}`}
              >
                {flags[f.key] ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-outline-variant">
          <Button fullWidth onClick={save} disabled={saving} loading={saving}>
            {!saving && (saved ? "Saved!" : "Save flags")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TenantsTable() {
  const [showProvision, setShowProvision] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<Tenant | null>(null);
  const [flagTenant, setFlagTenant] = useState<Tenant | null>(null);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { body } = await apiFetch("/organizations");
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
          { label: "Total Tenants", value: tenants.length, icon: <Building2 className="w-4 h-4" />, accent: "text-primary" },
          { label: "Active", value: activeCount, icon: <CheckCircle className="w-4 h-4" />, accent: "text-emerald-300" },
          { label: "Inactive / Suspended", value: inactiveCount, icon: <Users className="w-4 h-4" />, accent: "text-on-surface-variant" },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center ${s.accent}`}>{s.icon}</div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${s.accent}`}>{isLoading ? "—" : s.value}</p>
              <p className="text-[11px] text-on-surface-variant/50">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">Manage all tenant organizations.</p>
        <Button onClick={() => setShowProvision(true)}>
          <Plus className="w-4 h-4" />
          Provision Tenant
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load tenants.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Organization</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">Domain</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden lg:table-cell">Created</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">{t.name[0]}</span>
                      </div>
                      <Link
                        to="/tenant/$tenantId"
                        params={{ tenantId: t.id }}
                        className="text-sm font-medium text-on-surface hover:text-primary transition-colors flex items-center gap-1 group"
                      >
                        {t.name}
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden md:table-cell">{t.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${STATUS_CLS[t.status] ?? "bg-white/8 text-on-surface-variant border-white/10"}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60 hidden lg:table-cell">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setFlagTenant(t)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors" title="Feature flags"><Flag className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditTenant(t)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTenant(t)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">No tenants yet</p>
                      <button onClick={() => setShowProvision(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Provision first tenant</button>
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
