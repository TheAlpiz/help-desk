import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Building2,
  Inbox,
  Users,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Ticket,
} from "lucide-react";
import { useAppStore } from "@/store";
import { Button, Input, FormError } from "@/components/ui";

export const Route = createFileRoute("/_auth/onboarding")({
  component: Onboarding,
});

const STEPS = [
  { id: "org", label: "Your org", icon: Building2 },
  { id: "mailbox", label: "Connect mailbox", icon: Inbox },
  { id: "team", label: "Invite team", icon: Users },
  { id: "done", label: "All set!", icon: CheckCircle },
] as const;

function getAuthHeaders() {
  const state = useAppStore.getState();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) h["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) h["X-Tenant-ID"] = state.tenantId;
  return h;
}

function OrgStep({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) return;
      await authFetch("/api/organizations", {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name, supportEmail }),
      });
    },
    onSuccess: onNext,
    onError: onNext,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Set up your organization</h2>
        <p className="text-sm text-on-surface-variant mt-1">Tell us about your support team.</p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Organization name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">Support email</label>
          <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="support@acme.com" type="email" />
        </div>
      </div>
      <Button fullWidth onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} loading={save.isPending}>
        Continue <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function MailboxStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  const connect = useMutation({
    mutationFn: async () => {
      const res = await authFetch("/api/mailboxes", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          emailAddress: email,
          imapHost,
          imapPort: 993,
          imapSecure: true,
          smtpHost,
          smtpPort: 587,
          smtpSecure: true,
          username: email,
          password: imapPassword,
        }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: onNext,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Connect a mailbox</h2>
        <p className="text-sm text-on-surface-variant mt-1">Receive customer emails as tickets.</p>
      </div>
      <div className="space-y-3">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@company.com" type="email" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="IMAP host" />
          <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="SMTP host" />
        </div>
        <Input value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder="App password / credentials" type="password" />
      </div>
      <FormError>{connect.error ? (connect.error as Error).message : undefined}</FormError>
      <Button fullWidth onClick={() => connect.mutate()} disabled={!email || !imapHost || !smtpHost || connect.isPending} loading={connect.isPending}>
        Connect & continue <ChevronRight className="w-4 h-4" />
      </Button>
      <button onClick={onSkip} className="w-full text-sm text-on-surface-variant/50 hover:text-on-surface-variant transition-colors py-1">
        Skip for now
      </button>
    </div>
  );
}

function TeamStep({ onNext }: { onNext: () => void }) {
  const [emails, setEmails] = useState(["", "", ""]);

  const invite = useMutation({
    mutationFn: async () => {
      const valid = emails.filter((e) => e.includes("@"));
      await Promise.allSettled(
        valid.map((email) =>
          authFetch("/api/users/invite", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ email, globalRole: "AGENT" }),
          }),
        ),
      );
    },
    onSuccess: onNext,
    onError: onNext,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-on-surface">Invite your team</h2>
        <p className="text-sm text-on-surface-variant mt-1">Add agents who'll handle tickets.</p>
      </div>
      <div className="space-y-2">
        {emails.map((email, i) => (
          <Input
            key={i}
            value={email}
            onChange={(e) => setEmails((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
            placeholder={`agent${i + 1}@company.com`}
            type="email"
          />
        ))}
      </div>
      <Button fullWidth onClick={() => invite.mutate()} disabled={invite.isPending} loading={invite.isPending}>
        Send invites <ChevronRight className="w-4 h-4" />
      </Button>
      <button onClick={onNext} className="w-full text-sm text-on-surface-variant/50 hover:text-on-surface-variant transition-colors py-1">
        Skip for now
      </button>
    </div>
  );
}

function DoneStep() {
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-on-surface">You're all set!</h2>
        <p className="text-sm text-on-surface-variant mt-1">Your help desk is ready. Start handling tickets.</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button fullWidth onClick={() => navigate({ to: "/tickets" })}>
          <Ticket className="w-4 h-4" />
          View tickets
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate({ to: "/dashboard" })}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}

function Onboarding() {
  const [step, setStep] = useState(0);
  const currentStep = STEPS[step];

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                i < step
                  ? "bg-primary border-primary text-on-primary"
                  : i === step
                  ? "border-primary text-primary"
                  : "border-outline-variant text-on-surface-variant/30"
              }`}>
                {i < step ? (
                  <CheckCircle className="w-3.5 h-3.5" />
                ) : (
                  <s.icon className="w-3.5 h-3.5" />
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < step ? "bg-primary" : "bg-outline-variant"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-2xl p-7 space-y-6">
          {step === 0 && <OrgStep onNext={() => setStep(1)} />}
          {step === 1 && <MailboxStep onNext={() => setStep(2)} onSkip={() => setStep(2)} />}
          {step === 2 && <TeamStep onNext={() => setStep(3)} />}
          {step === 3 && <DoneStep />}

          {step > 0 && step < 3 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
