import { createFileRoute, Link } from "@tanstack/react-router";
import { authFetch, api } from "@/lib/api";
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Palette, Shield, Bell, Globe, ChevronRight, Database, Key, Users, AlertTriangle, LogIn, UserCheck, RefreshCw } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import { OrganizationSettingsForm } from "@/features/settings/components/OrganizationSettingsForm";
import { Button, Input, FormAlert, FormError } from "@/components/ui";

export const Route = createFileRoute("/_auth/settings")({
  validateSearch: z.object({ tab: z.string().optional() }),
  component: GlobalSettings,
});

const inputCls = "w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";

const TABS = [
  { key: "general", icon: Building2 },
  { key: "branding", icon: Palette },
  { key: "members", icon: Users },
  { key: "retention", icon: Database },
  { key: "sso", icon: Key },
  { key: "danger", icon: AlertTriangle },
  { key: "security", icon: Shield, href: "/account-security" },
  { key: "notifications", icon: Bell, href: "/notification-preferences" },
];

function getAuthHeaders() {
  const state = useAppStore.getState();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

const ROLE_CLS: Record<string, string> = {
  ADMIN: "bg-primary/15 text-primary border border-primary/20",
  SUPERVISOR: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
  AGENT: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  REQUESTER: "bg-white/8 text-on-surface-variant border border-white/10",
};

function OrgMembersSettings() {
  const { t } = useTranslation("settings");
  const tenantId = useAppStore((s) => s.tenantId);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["org-members"],
    queryFn: async () => {
      const res = await authFetch("/api/users", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const members: any[] = (data as any)?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authFetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "inactive" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>;
  if (error) return <div className="text-sm text-error">{t("members.loadError")}</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant/60">{t("members.count", { count: members.length })}</p>
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-outline-variant">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("members.name")}</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("members.role")}</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">{t("members.status")}</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">{t("members.actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {members.map((u: any) => (
              <tr key={u.id} className="hover:bg-white/3 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-on-surface">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-on-surface-variant/50">{u.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded ${ROLE_CLS[u.globalRole] ?? "bg-white/8 text-on-surface-variant"}`}>
                    {u.globalRole}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${u.status === "active" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" : "bg-white/8 text-on-surface-variant/50 border-white/10"}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.status === "active" ? (
                    <button
                      onClick={() => deactivateMutation.mutate(u.id)}
                      disabled={deactivateMutation.isPending}
                      className="text-xs text-on-surface-variant/50 hover:text-error transition-colors px-2 py-1 rounded hover:bg-error-container/20"
                    >
                      {t("members.deactivate")}
                    </button>
                  ) : (
                    <span className="text-xs text-on-surface-variant/25">{t("members.inactive")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DangerZoneSettings() {
  const { t } = useTranslation("settings");
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const tenantId = useAppStore((s) => s.tenantId);

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch(`/api/organizations/${tenantId}/deactivate`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to deactivate organization");
    },
    onSuccess: () => {
      useAppStore.getState().logout();
      window.location.href = "/login";
    },
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface-container border border-error/20 rounded-xl overflow-hidden">
        {/* Deactivate org */}
        <div className="p-5 border-b border-error/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">{t("danger.deactivateOrg")}</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">{t("danger.deactivateOrgDesc")}</p>
            </div>
            <button
              onClick={() => setConfirmDeactivate(true)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-error-container/20 border border-error/30 text-error rounded-lg hover:bg-error-container/40 transition-colors"
            >
              {t("danger.deactivate")}
            </button>
          </div>
          {confirmDeactivate && (
            <div className="mt-4 p-4 bg-error-container/10 border border-error/20 rounded-lg space-y-3">
              <p className="text-xs text-error font-medium">{t("danger.deactivateWarning")}</p>
              <p className="text-xs text-on-surface-variant/60">{t("danger.typeToConfirmPre")} <span className="font-mono font-bold text-on-surface">DEACTIVATE</span> {t("danger.typeToConfirmPost")}</p>
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="DEACTIVATE"
                className="w-full px-3 py-2 bg-surface-container-high border border-error/30 rounded-lg text-sm text-on-surface font-mono placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-error/40 transition-colors"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setConfirmDeactivate(false); setInputVal(""); }}>{t("danger.cancel")}</Button>
                <button
                  onClick={() => deactivateMutation.mutate()}
                  disabled={inputVal !== "DEACTIVATE" || deactivateMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-error text-on-error rounded-lg hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deactivateMutation.isPending ? t("danger.deactivating") : t("danger.confirmDeactivation")}
                </button>
              </div>
              {deactivateMutation.isError && <p className="text-xs text-error">{(deactivateMutation.error as Error).message}</p>}
            </div>
          )}
        </div>

        {/* Export all data */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">{t("danger.exportTitle")}</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">{t("danger.exportDesc")}</p>
            </div>
            <a
              href="/export"
              className="shrink-0 px-3 py-1.5 text-xs font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-white/5 transition-colors"
            >
              {t("danger.goToExport")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB, matches logoHint

function BrandingSettings() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [supportEmail, setSupportEmail] = useState("");
  const [brandColor, setBrandColor] = useState("#c0c1ff");
  const [localError, setLocalError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["org-branding"],
    queryFn: async () => {
      const res = await api.organizations.branding.$get();
      if (!res.ok) throw new Error("Failed to load branding");
      return res.json();
    },
  });

  // Hydrate local form state once branding loads.
  useEffect(() => {
    const b = (data as any)?.data;
    if (!b) return;
    setLogoUrl(b.logoUrl ?? null);
    setSupportEmail(b.supportEmail ?? "");
    setBrandColor(HEX_RE.test(b.brandColor ?? "") ? b.brandColor : "#c0c1ff");
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.organizations.branding.$put({
        json: {
          logoUrl: logoUrl ?? null,
          supportEmail: supportEmail.trim(),
          brandColor,
        },
      });
      const body = (await res.json()) as any;
      if (!res.ok) throw new Error(body?.error?.message || "Failed to save branding");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-branding"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const onPickLogo = (file: File | undefined) => {
    setLocalError(null);
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      setLocalError(t("branding.logoHint"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const colorValid = HEX_RE.test(brandColor);
  const emailValid =
    supportEmail.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim());
  const canSave = colorValid && emailValid && !mutation.isPending;

  if (isLoading) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-16 bg-white/5 rounded" />
          <div className="h-10 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
      <p className="text-xs text-on-surface-variant">{t("branding.intro")}</p>

      {(localError || mutation.isError) && (
        <FormAlert>{localError || (mutation.error as Error)?.message}</FormAlert>
      )}
      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
          {t("form.savedSuccess")}
        </div>
      )}

      {/* Logo */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-on-surface">{t("branding.logo")}</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <Globe className="w-6 h-6 text-on-surface-variant/30" />
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => onPickLogo(e.target.files?.[0])}
            />
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                {t("branding.uploadLogo")}
              </Button>
              {logoUrl && (
                <button
                  onClick={() => setLogoUrl(null)}
                  className="text-xs text-on-surface-variant/50 hover:text-error transition-colors"
                >
                  {t("branding.remove")}
                </button>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant/40 mt-1">{t("branding.logoHint")}</p>
          </div>
        </div>
      </div>

      {/* Support email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">{t("branding.supportEmail")}</label>
        <Input
          dense
          type="email"
          placeholder="support@yourcompany.com"
          value={supportEmail}
          onChange={(e) => setSupportEmail(e.target.value)}
        />
        <p className="text-[10px] text-on-surface-variant/40">{t("branding.supportEmailHint")}</p>
      </div>

      {/* Brand color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">{t("branding.brandColor")}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={colorValid ? brandColor : "#c0c1ff"}
            onChange={(e) => setBrandColor(e.target.value)}
            aria-label={t("branding.brandColor")}
            className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            className="w-28 px-2 py-1.5 bg-surface-container-high border border-outline-variant rounded-lg text-xs font-mono text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {!colorValid && <FormError>{t("branding.colorInvalid")}</FormError>}
      </div>

      <div className="pt-2 flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={!canSave} loading={mutation.isPending}>
          {t("branding.save")}
        </Button>
      </div>
    </div>
  );
}


function DataRetentionSettings() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();

  const [auditDays, setAuditDays] = useState("365");
  const [ticketDays, setTicketDays] = useState("730");
  const [attachDays, setAttachDays] = useState("365");
  const [autoDelete, setAutoDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["org-retention"],
    queryFn: async () => {
      const res = await authFetch("/api/organizations/retention", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load retention settings");
      return res.json();
    },
  });

  useEffect(() => {
    const r = (data as any)?.data;
    if (!r) return;
    setAuditDays(r.auditLogRetentionDays?.toString() ?? "365");
    setTicketDays(r.ticketRetentionDays?.toString() ?? "730");
    setAttachDays(r.attachmentRetentionDays?.toString() ?? "365");
    setAutoDelete(r.isAutoArchivalEnabled ?? false);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/organizations/retention", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          auditLogRetentionDays: parseInt(auditDays, 10),
          ticketRetentionDays: parseInt(ticketDays, 10),
          attachmentRetentionDays: parseInt(attachDays, 10),
          isAutoArchivalEnabled: autoDelete,
        }),
      });
      if (!res.ok) throw new Error("Failed to save retention settings");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-retention"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-1/3" />
          <div className="h-10 bg-white/5 rounded" />
          <div className="h-10 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
      <p className="text-xs text-on-surface-variant">
        {t("retention.intro")}
      </p>

      {mutation.isError && (
        <FormAlert>{(mutation.error as Error)?.message}</FormAlert>
      )}
      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300">
          {t("form.savedSuccess")}
        </div>
      )}

      {[
        { label: t("retention.auditDays"), value: auditDays, onChange: setAuditDays, help: t("retention.auditHint") },
        { label: t("retention.ticketDays"), value: ticketDays, onChange: setTicketDays, help: t("retention.ticketHint") },
        { label: t("retention.attachmentDays"), value: attachDays, onChange: setAttachDays, help: t("retention.attachmentHint") },
      ].map(({ label, value, onChange, help }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-on-surface">{label}</label>
          <Input
            dense
            type="number"
            min={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
          />
          <p className="text-[10px] text-on-surface-variant/40">{help}</p>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={() => setAutoDelete(!autoDelete)}
          aria-label={autoDelete ? t("retention.disableAutoDelete") : t("retention.enableAutoDelete")}
          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${autoDelete ? "bg-error" : "bg-outline-variant"}`}
        >
          <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoDelete ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <div>
          <p className="text-sm text-on-surface">{t("retention.autoDelete")}</p>
          <p className="text-xs text-on-surface-variant/50">{t("retention.autoDeleteHint")}</p>
        </div>
      </div>

      {autoDelete && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
          <Shield className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-xs text-error">{t("retention.autoDeleteWarning")}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
          {saved ? t("retention.saved") : t("retention.save")}
        </Button>
      </div>
    </div>
  );
}

function SsoSettings() {
  const { t } = useTranslation("settings");
  return (
    <ComingSoon
      icon={LogIn}
      title={t("sso.title")}
      description={t("sso.description")}
      features={[
        {
          icon: LogIn,
          label: t("sso.features.ssoLabel"),
          description: t("sso.features.ssoDesc"),
        },
        {
          icon: UserCheck,
          label: t("sso.features.scimLabel"),
          description: t("sso.features.scimDesc"),
        },
        {
          icon: RefreshCw,
          label: t("sso.features.jitLabel"),
          description: t("sso.features.jitDesc"),
        },
      ]}
    />
  );
}

function GlobalSettings() {
  const { t } = useTranslation("settings");
  const { tab = "general" } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab);

  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <aside className="w-44 shrink-0">
        <nav className="space-y-0.5">
          {TABS.map((tabItem) => {
            const Icon = tabItem.icon;
            if (tabItem.href) {
              return (
                <Link
                  key={tabItem.key}
                  to={tabItem.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors group"
                >
                  <Icon className="w-4 h-4" />
                  {t(`tabs.${tabItem.key}`)}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                </Link>
              );
            }
            return (
              <button
                key={tabItem.key}
                onClick={() => setActiveTab(tabItem.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === tabItem.key
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(`tabs.${tabItem.key}`)}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeTab === "general" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.general.title")}</h1>
              <p className="text-xs text-on-surface-variant mt-1">{t("headers.general.subtitle")}</p>
            </div>
            <OrganizationSettingsForm />
          </div>
        )}
        {activeTab === "branding" && (
          <div className="space-y-8">
            <div className="space-y-4">
              <div>
                <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.branding.title")}</h1>
                <p className="text-xs text-on-surface-variant mt-1">{t("headers.branding.subtitle")}</p>
              </div>
              <BrandingSettings />
            </div>
          </div>
        )}
        {activeTab === "retention" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.retention.title")}</h1>
              <p className="text-xs text-on-surface-variant mt-1">{t("headers.retention.subtitle")}</p>
            </div>
            <DataRetentionSettings />
          </div>
        )}
        {activeTab === "sso" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.sso.title")}</h1>
              <p className="text-xs text-on-surface-variant mt-1">{t("headers.sso.subtitle")}</p>
            </div>
            <SsoSettings />
          </div>
        )}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.members.title")}</h1>
              <p className="text-xs text-on-surface-variant mt-1">{t("headers.members.subtitle")}</p>
            </div>
            <OrgMembersSettings />
          </div>
        )}
        {activeTab === "danger" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">{t("headers.danger.title")}</h1>
              <p className="text-xs text-on-surface-variant mt-1">{t("headers.danger.subtitle")}</p>
            </div>
            <DangerZoneSettings />
          </div>
        )}
      </div>
    </div>
  );
}
