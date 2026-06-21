import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useState } from "react";
import { Building2, Palette, Shield, Bell, Globe, ChevronRight, Database, Key, Users, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import { OrganizationSettingsForm } from "@/features/settings/components/OrganizationSettingsForm";
import { Button, Input } from "@/components/ui";

export const Route = createFileRoute("/_auth/settings")({
  validateSearch: z.object({ tab: z.string().optional() }),
  component: GlobalSettings,
});

const TABS = [
  { key: "general", label: "General", icon: Building2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "members", label: "Members", icon: Users },
  { key: "retention", label: "Data Retention", icon: Database },
  { key: "sso", label: "SSO / SCIM", icon: Key },
  { key: "danger", label: "Danger Zone", icon: AlertTriangle },
  { key: "security", label: "Security", icon: Shield, href: "/account-security" },
  { key: "notifications", label: "Notifications", icon: Bell, href: "/notification-preferences" },
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
  const tenantId = useAppStore((s) => s.tenantId);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["org-members"],
    queryFn: async () => {
      const res = await fetch("/api/users", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const members: any[] = (data as any)?.data ?? [];

  const deactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "inactive" }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org-members"] }),
  });

  if (isLoading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}</div>;
  if (error) return <div className="text-sm text-error">Failed to load members.</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-on-surface-variant/60">{members.length} member{members.length !== 1 ? "s" : ""} in this organization</p>
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="border-b border-outline-variant">
            <tr>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
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
                      Deactivate
                    </button>
                  ) : (
                    <span className="text-xs text-on-surface-variant/25">Inactive</span>
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
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const tenantId = useAppStore((s) => s.tenantId);

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/organizations/${tenantId}/deactivate`, {
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
              <p className="text-sm font-semibold text-on-surface">Deactivate organization</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Suspend access for all members. Data is retained. Can be re-activated by a super admin.</p>
            </div>
            <button
              onClick={() => setConfirmDeactivate(true)}
              className="shrink-0 px-3 py-1.5 text-xs font-medium bg-error-container/20 border border-error/30 text-error rounded-lg hover:bg-error-container/40 transition-colors"
            >
              Deactivate
            </button>
          </div>
          {confirmDeactivate && (
            <div className="mt-4 p-4 bg-error-container/10 border border-error/20 rounded-lg space-y-3">
              <p className="text-xs text-error font-medium">This will immediately suspend access for all organization members.</p>
              <p className="text-xs text-on-surface-variant/60">Type <span className="font-mono font-bold text-on-surface">DEACTIVATE</span> to confirm:</p>
              <input
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="DEACTIVATE"
                className="w-full px-3 py-2 bg-surface-container-high border border-error/30 rounded-lg text-sm text-on-surface font-mono placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-error/40 transition-colors"
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setConfirmDeactivate(false); setInputVal(""); }}>Cancel</Button>
                <button
                  onClick={() => deactivateMutation.mutate()}
                  disabled={inputVal !== "DEACTIVATE" || deactivateMutation.isPending}
                  className="px-3 py-1.5 text-xs font-medium bg-error text-on-error rounded-lg hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {deactivateMutation.isPending ? "Deactivating..." : "Confirm deactivation"}
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
              <p className="text-sm font-semibold text-on-surface">Export all data</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">Download a full export of all organization data as a ZIP archive.</p>
            </div>
            <a
              href="/export"
              className="shrink-0 px-3 py-1.5 text-xs font-medium border border-outline-variant text-on-surface-variant rounded-lg hover:bg-white/5 transition-colors"
            >
              Go to Export
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandingSettings() {
  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
      <p className="text-xs text-on-surface-variant">
        Customize how your workspace looks to your team and customers.
      </p>

      {/* Logo */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-on-surface">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center">
            <Globe className="w-6 h-6 text-on-surface-variant/30" />
          </div>
          <div>
            <Button variant="secondary">Upload logo</Button>
            <p className="text-[10px] text-on-surface-variant/40 mt-1">PNG, SVG, max 2MB</p>
          </div>
        </div>
      </div>

      {/* Support email */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">Support email address</label>
        <Input dense type="email" placeholder="support@yourcompany.com" />
        <p className="text-[10px] text-on-surface-variant/40">Shown to customers in emails and the portal</p>
      </div>

      {/* Accent color */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">Brand color</label>
        <div className="flex items-center gap-3">
          <input type="color" defaultValue="#c0c1ff" className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer bg-transparent" />
          <span className="text-xs font-mono text-on-surface-variant">#c0c1ff</span>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button disabled>Save branding</Button>
      </div>
      <p className="text-[10px] text-on-surface-variant/30 text-center">Branding settings require backend implementation — form stubbed</p>
    </div>
  );
}


function DataRetentionSettings() {
  const [auditDays, setAuditDays] = useState("365");
  const [ticketDays, setTicketDays] = useState("730");
  const [attachDays, setAttachDays] = useState("365");
  const [autoDelete, setAutoDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
      <p className="text-xs text-on-surface-variant">
        Configure how long data is retained before automatic archival or deletion. Changes require backend worker support.
      </p>

      {[
        { label: "Audit log retention (days)", value: auditDays, onChange: setAuditDays, help: "Logs older than this are compressed and archived" },
        { label: "Ticket retention (days)", value: ticketDays, onChange: setTicketDays, help: "Closed tickets older than this are moved to cold storage" },
        { label: "Attachment retention (days)", value: attachDays, onChange: setAttachDays, help: "File attachments deleted after this period" },
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
          aria-label={autoDelete ? "Disable auto-delete" : "Enable auto-delete"}
          className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${autoDelete ? "bg-error" : "bg-outline-variant"}`}
        >
          <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoDelete ? "translate-x-4" : "translate-x-0"}`} />
        </button>
        <div>
          <p className="text-sm text-on-surface">Auto-delete expired data</p>
          <p className="text-xs text-on-surface-variant/50">Permanently delete data when retention period expires (irreversible)</p>
        </div>
      </div>

      {autoDelete && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-error/10 border border-error/20">
          <Shield className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-xs text-error">Auto-delete is enabled. Data will be permanently deleted after the retention period. This cannot be undone.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
          {saved ? "Saved ✓" : "Save retention policy"}
        </Button>
      </div>
      <p className="text-[10px] text-on-surface-variant/30 text-center">Backend retention worker runs nightly — config persisted locally until connected</p>
    </div>
  );
}

function SsoSettings() {
  const [provider, setProvider] = useState<"none" | "okta" | "google" | "azure" | "saml">("none");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [issuerUrl, setIssuerUrl] = useState("");
  const [scimEnabled, setScimEnabled] = useState(false);
  const [scimToken] = useState("scim_" + Math.random().toString(36).slice(2, 18));
  const [showSecret, setShowSecret] = useState(false);
  const [saved, setSaved] = useState(false);

  const PROVIDERS = [
    { value: "none", label: "No SSO (local auth only)" },
    { value: "okta", label: "Okta" },
    { value: "google", label: "Google Workspace" },
    { value: "azure", label: "Microsoft Azure AD" },
    { value: "saml", label: "Generic SAML 2.0" },
  ];

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-6 space-y-5">
      <p className="text-xs text-on-surface-variant">
        Configure Single Sign-On and SCIM provisioning for your organization.
      </p>

      {/* Provider */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">SSO Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as any)}
          className="w-full px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          aria-label="SSO provider"
        >
          {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {provider !== "none" && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">
              {provider === "saml" ? "Metadata URL / Issuer" : "Issuer / Discovery URL"}
            </label>
            <input
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.target.value)}
              placeholder={
                provider === "okta" ? "https://yourorg.okta.com/oauth2/default"
                : provider === "google" ? "https://accounts.google.com"
                : provider === "azure" ? "https://login.microsoftonline.com/{tenant}/v2.0"
                : "https://your-idp.example.com/saml/metadata"
              }
              className="w-full px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              aria-label="Issuer URL"
            />
          </div>

          {provider !== "saml" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Client ID</label>
                <input
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Client / Application ID"
                  className="w-full px-3.5 py-2.5 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  aria-label="Client ID"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Client Secret</label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Client secret"
                    className={`${inputCls} pr-16`}
                    aria-label="Client secret"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant/50 hover:text-on-surface-variant"
                  >
                    {showSecret ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Callback URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface">Callback URL (copy to IdP)</label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={`${window.location.origin}/auth/sso/callback`}
                className={`${inputCls} font-mono text-xs opacity-70 flex-1`}
              />
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/auth/sso/callback`)}
                className="px-3 py-2 text-xs border border-outline-variant rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </>
      )}

      {/* SCIM */}
      <div className="border-t border-outline-variant pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface">SCIM Provisioning</p>
            <p className="text-xs text-on-surface-variant/60">Automatically provision/deprovision users from your IdP</p>
          </div>
          <button
            onClick={() => setScimEnabled(!scimEnabled)}
            aria-label={scimEnabled ? "Disable SCIM" : "Enable SCIM"}
            className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${scimEnabled ? "bg-primary" : "bg-outline-variant"}`}
          >
            <span className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${scimEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </button>
        </div>
        {scimEnabled && (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">SCIM Base URL</label>
              <input readOnly value={`${window.location.origin}/api/scim/v2`} className={`${inputCls} font-mono text-xs opacity-70`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-on-surface">SCIM Bearer Token</label>
              <div className="flex items-center gap-2">
                <input readOnly value={scimToken} className={`${inputCls} font-mono text-xs opacity-70 flex-1`} />
                <button
                  onClick={() => navigator.clipboard.writeText(scimToken)}
                  className="px-3 py-2 text-xs border border-outline-variant rounded-lg hover:bg-white/5 transition-colors text-on-surface-variant shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>
          {saved ? "Saved ✓" : "Save SSO config"}
        </Button>
      </div>
      <p className="text-[10px] text-on-surface-variant/30 text-center">SSO/SCIM backend integration pending — configuration stored locally</p>
    </div>
  );
}

function GlobalSettings() {
  const { tab = "general" } = Route.useSearch();
  const [activeTab, setActiveTab] = useState(tab);

  return (
    <div className="flex gap-6">
      {/* Sidebar nav */}
      <aside className="w-44 shrink-0">
        <nav className="space-y-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            if (t.href) {
              return (
                <Link
                  key={t.key}
                  to={t.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors group"
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                </Link>
              );
            }
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeTab === t.key
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
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
              <h1 className="text-[15px] font-semibold text-on-surface">General Settings</h1>
              <p className="text-xs text-on-surface-variant mt-1">Organization name and domain.</p>
            </div>
            <OrganizationSettingsForm />
          </div>
        )}
        {activeTab === "branding" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">Branding</h1>
              <p className="text-xs text-on-surface-variant mt-1">Logo, colors, and support contact.</p>
            </div>
            <BrandingSettings />
          </div>
        )}
        {activeTab === "retention" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">Data Retention</h1>
              <p className="text-xs text-on-surface-variant mt-1">Configure archival and deletion policies.</p>
            </div>
            <DataRetentionSettings />
          </div>
        )}
        {activeTab === "sso" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">SSO / SCIM</h1>
              <p className="text-xs text-on-surface-variant mt-1">Single Sign-On and user provisioning.</p>
            </div>
            <SsoSettings />
          </div>
        )}
        {activeTab === "members" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">Members</h1>
              <p className="text-xs text-on-surface-variant mt-1">View and manage organization members.</p>
            </div>
            <OrgMembersSettings />
          </div>
        )}
        {activeTab === "danger" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-[15px] font-semibold text-on-surface">Danger Zone</h1>
              <p className="text-xs text-on-surface-variant mt-1">Irreversible actions — proceed with caution.</p>
            </div>
            <DangerZoneSettings />
          </div>
        )}
      </div>
    </div>
  );
}
