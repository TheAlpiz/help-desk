import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, CheckCircle2, AlertCircle, Clock, Download, Lock, Eye, Trash2, FileText } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { Button, Input } from "@/components/ui";

export const Route = createFileRoute("/_auth/compliance")({
  component: ComplianceDashboard,
});

const FRAMEWORKS = [
  { key: "gdpr", label: "GDPR", region: "EU", controls: 24, passed: 21, status: "partial" as const },
  { key: "soc2", label: "SOC 2 Type II", region: "US", controls: 60, passed: 60, status: "passing" as const },
  { key: "iso27001", label: "ISO 27001", region: "Global", controls: 114, passed: 98, status: "partial" as const },
  { key: "hipaa", label: "HIPAA", region: "US", controls: 45, passed: 0, status: "not-started" as const },
];

type DsrType = "access" | "deletion" | "portability" | "rectification";
type DsrStatus = "pending" | "processing" | "completed" | "rejected";

interface DataSubjectRequest {
  id: string;
  type: DsrType;
  subject: string;
  status: DsrStatus;
  requestedAt: string;
}

const DSR_TYPES: Record<DsrType, string> = {
  access: "Data access",
  deletion: "Right to erasure",
  portability: "Data portability",
  rectification: "Rectification",
};

const DSR_STATUS_CLS: Record<DsrStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  processing: "bg-primary/15 text-primary border-primary/20",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  rejected: "bg-error-container/20 text-error border-error/20",
};

const SAMPLE_DSRS: DataSubjectRequest[] = [
  { id: "dsr-1", type: "deletion", subject: "john.doe@example.com", status: "pending", requestedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "dsr-2", type: "access", subject: "jane.smith@corp.com", status: "completed", requestedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: "dsr-3", type: "portability", subject: "user@test.io", status: "processing", requestedAt: new Date(Date.now() - 86400000).toISOString() },
];

const LEGAL_HOLDS = [
  { id: "lh-1", label: "Q4 2024 Audit", ticketCount: 142, createdAt: "2024-11-01", active: true },
  { id: "lh-2", label: "Litigation Hold — Case #2024-0891", ticketCount: 38, createdAt: "2024-09-15", active: true },
  { id: "lh-3", label: "GDPR Investigation 2024", ticketCount: 7, createdAt: "2024-06-01", active: false },
];

function FrameworkCard({ f }: { f: (typeof FRAMEWORKS)[0] }) {
  const pct = f.controls > 0 ? Math.round((f.passed / f.controls) * 100) : 0;
  const color = f.status === "passing" ? "bg-emerald-500" : f.status === "partial" ? "bg-amber-500" : "bg-white/10";
  const textColor = f.status === "passing" ? "text-emerald-400" : f.status === "partial" ? "text-amber-400" : "text-on-surface-variant/40";

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-on-surface">{f.label}</p>
          <p className="text-xs text-on-surface-variant/50">{f.region}</p>
        </div>
        <span className={`text-[10px] font-bold ${textColor}`}>
          {f.status === "passing" ? "✓ PASSING" : f.status === "partial" ? "PARTIAL" : "NOT STARTED"}
        </span>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-on-surface-variant/60">{f.passed} / {f.controls} controls</span>
          <span className="text-xs font-semibold text-on-surface">{pct}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button className="text-[11px] text-primary hover:text-primary/80 transition-colors">View controls →</button>
    </div>
  );
}

function ComplianceDashboard() {
  const [dsrs, setDsrs] = useState<DataSubjectRequest[]>(SAMPLE_DSRS);
  const [newDsrOpen, setNewDsrOpen] = useState(false);
  const [newDsrType, setNewDsrType] = useState<DsrType>("access");
  const [newDsrSubject, setNewDsrSubject] = useState("");
  const [holds, setHolds] = useState(LEGAL_HOLDS);
  const [newHoldLabel, setNewHoldLabel] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "dsr" | "legal-hold" | "audit">("overview");
  const { success } = useToast();

  const submitDsr = () => {
    if (!newDsrSubject.trim()) return;
    setDsrs((prev) => [...prev, {
      id: `dsr-${Date.now()}`,
      type: newDsrType,
      subject: newDsrSubject.trim(),
      status: "pending",
      requestedAt: new Date().toISOString(),
    }]);
    setNewDsrSubject("");
    setNewDsrOpen(false);
    success("DSR submitted");
  };

  const createHold = () => {
    if (!newHoldLabel.trim()) return;
    setHolds((prev) => [...prev, { id: `lh-${Date.now()}`, label: newHoldLabel.trim(), ticketCount: 0, createdAt: new Date().toISOString().slice(0, 10), active: true }]);
    setNewHoldLabel("");
    success("Legal hold created");
  };

  const tabs = [
    { key: "overview", label: "Framework Overview" },
    { key: "dsr", label: "Data Subject Requests" },
    { key: "legal-hold", label: "Legal Holds" },
    { key: "audit", label: "Compliance Audit" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Compliance Dashboard
          </h1>
          <p className="text-xs text-on-surface-variant mt-1">Compliance posture, data subject rights, and legal holds.</p>
        </div>
        <Button variant="secondary">
          <Download className="w-3.5 h-3.5" />
          Export report
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant pb-px">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === t.key ? "text-primary border-primary" : "text-on-surface-variant/60 border-transparent hover:text-on-surface-variant"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FRAMEWORKS.map((f) => <FrameworkCard key={f.key} f={f} />)}
        </div>
      )}

      {activeTab === "dsr" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant/60">{dsrs.filter((d) => d.status === "pending").length} pending requests</p>
            <Button onClick={() => setNewDsrOpen(true)}>+ New DSR</Button>
          </div>

          {newDsrOpen && (
            <div className="bg-surface-container border border-primary/20 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-on-surface">New data subject request</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant/60 block mb-1">Request type</label>
                  <select value={newDsrType} onChange={(e) => setNewDsrType(e.target.value as DsrType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary/50">
                    {Object.entries(DSR_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant/60 block mb-1">Subject email</label>
                  <input type="email" value={newDsrSubject} onChange={(e) => setNewDsrSubject(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setNewDsrOpen(false)}>Cancel</Button>
                <Button onClick={submitDsr} disabled={!newDsrSubject.trim()}>Submit</Button>
              </div>
            </div>
          )}

          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {dsrs.map((d) => (
                  <tr key={d.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-on-surface">{d.subject}</td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant/70">{DSR_TYPES[d.type]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${DSR_STATUS_CLS[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant/40">{new Date(d.requestedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "legal-hold" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              dense
              value={newHoldLabel}
              onChange={(e) => setNewHoldLabel(e.target.value)}
              placeholder="Legal hold name…"
              onKeyDown={(e) => { if (e.key === "Enter" && newHoldLabel) createHold(); }}
              className="flex-1"
            />
            <Button onClick={createHold} disabled={!newHoldLabel.trim()}>Create Hold</Button>
          </div>

          <div className="space-y-2">
            {holds.map((h) => (
              <div key={h.id} className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${h.active ? "bg-surface-container border-outline-variant" : "bg-surface-container/50 border-outline-variant/30 opacity-60"}`}>
                <Lock className={`w-4 h-4 shrink-0 ${h.active ? "text-amber-400" : "text-on-surface-variant/30"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface">{h.label}</p>
                  <p className="text-xs text-on-surface-variant/50">{h.ticketCount} tickets frozen · Created {h.createdAt}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${h.active ? "bg-amber-500/15 text-amber-300 border-amber-500/20" : "bg-white/5 text-on-surface-variant/40 border-white/10"}`}>
                  {h.active ? "ACTIVE" : "RELEASED"}
                </span>
                {h.active && (
                  <button
                    onClick={() => setHolds((prev) => prev.map((x) => x.id === h.id ? { ...x, active: false } : x))}
                    className="p-1.5 text-on-surface-variant/30 hover:text-error transition-colors"
                    title="Release hold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-4">
          <p className="text-xs text-on-surface-variant/60">Automated compliance checks run nightly.</p>
          <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant overflow-hidden">
            {[
              { label: "Data encryption at rest", status: "pass" as const },
              { label: "TLS 1.2+ for all endpoints", status: "pass" as const },
              { label: "Audit logging enabled", status: "pass" as const },
              { label: "Role-based access control", status: "pass" as const },
              { label: "Password complexity policy", status: "pass" as const },
              { label: "Session timeout (30 min)", status: "warning" as const, note: "Currently 8 hours" },
              { label: "MFA enforcement", status: "fail" as const, note: "MFA not yet enforced for all users" },
              { label: "Data retention policy set", status: "pass" as const },
              { label: "GDPR data mapping complete", status: "warning" as const, note: "2 processors not mapped" },
            ].map((check) => (
              <div key={check.label} className="flex items-center gap-3 px-4 py-3">
                {check.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  : check.status === "warning" ? <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-error shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm text-on-surface">{check.label}</p>
                  {check.note && <p className="text-xs text-on-surface-variant/50 mt-0.5">{check.note}</p>}
                </div>
                <span className={`text-[10px] font-semibold ${check.status === "pass" ? "text-emerald-400" : check.status === "warning" ? "text-amber-400" : "text-error"}`}>
                  {check.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
