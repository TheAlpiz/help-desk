import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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

function useSteps() {
  const { t } = useTranslation("onboarding");
  return [
    { id: "org", label: t("steps.org"), icon: Building2 },
    { id: "mailbox", label: t("steps.mailbox"), icon: Inbox },
    { id: "team", label: t("steps.team"), icon: Users },
    { id: "done", label: t("steps.done"), icon: CheckCircle },
  ] as const;
}



function OrgStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("onboarding");
  const [name, setName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) return;

      const tenantId = useAppStore.getState().tenantId!;

      const resOrg = await api.organizations[":id"].$put({
        param: { id: tenantId },
        json: { name } as any,
      });
      if (!resOrg.ok) throw new Error("Failed to update org");

      if (supportEmail.trim()) {
        const currentRes = await (api.organizations as any).branding.$get();
        const currentBranding = currentRes.ok ? (await currentRes.json())?.data || {} : {};

        const resBranding = await (api.organizations as any).branding.$put({
          json: {
            ...currentBranding,
            supportEmail: supportEmail.trim()
          } as any,
        });
        if (!resBranding.ok) throw new Error("Failed to update support email");
      }
    },
    onSuccess: onNext,
    onError: onNext,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-on-surface">{t("org.title")}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{t("org.subtitle")}</p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">{t("org.nameLabel")}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("org.namePlaceholder")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-on-surface">{t("org.emailLabel")}</label>
          <Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder={t("org.emailPlaceholder")} type="email" />
        </div>
      </div>
      <Button fullWidth onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} loading={save.isPending}>
        {t("org.continue")} <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function MailboxStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const { t } = useTranslation("onboarding");
  const [email, setEmail] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  const connect = useMutation({
    mutationFn: async () => {
      const res = await api.mailboxes.index.$post({
        json: {
          emailAddress: email,
          imapHost,
          imapPort: 993,
          imapSecure: true,
          smtpHost,
          smtpPort: 587,
          smtpSecure: true,
          username: email,
          password: imapPassword,
        } as any,
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: onNext,
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-on-surface">{t("mailbox.title")}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{t("mailbox.subtitle")}</p>
      </div>
      <div className="space-y-3">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@company.com" type="email" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder={t("mailbox.imapPlaceholder")} />
          <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder={t("mailbox.smtpPlaceholder")} />
        </div>
        <Input value={imapPassword} onChange={(e) => setImapPassword(e.target.value)} placeholder={t("mailbox.passwordPlaceholder")} type="password" />
      </div>
      <FormError>{connect.error ? (connect.error as Error).message : undefined}</FormError>
      <Button fullWidth onClick={() => connect.mutate()} disabled={!email || !imapHost || !smtpHost || connect.isPending} loading={connect.isPending}>
        {t("mailbox.connect")} <ChevronRight className="w-4 h-4" />
      </Button>
      <button onClick={onSkip} className="w-full text-sm text-on-surface-variant/50 hover:text-on-surface-variant transition-colors py-1">
        {t("mailbox.skip")}
      </button>
    </div>
  );
}

function TeamStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("onboarding");
  const [emails, setEmails] = useState(["", "", ""]);

  const invite = useMutation({
    mutationFn: async () => {
      const valid = emails.filter((e) => e.includes("@"));
      await Promise.allSettled(
        valid.map((email) =>
          api.users.index.$post({
            json: { email, globalRole: "AGENT" } as any,
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
        <h2 className="text-lg font-bold text-on-surface">{t("team.title")}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{t("team.subtitle")}</p>
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
        {t("team.sendInvites")} <ChevronRight className="w-4 h-4" />
      </Button>
      <button onClick={onNext} className="w-full text-sm text-on-surface-variant/50 hover:text-on-surface-variant transition-colors py-1">
        {t("team.skip")}
      </button>
    </div>
  );
}

function DoneStep() {
  const { t } = useTranslation("onboarding");
  const navigate = useNavigate();
  return (
    <div className="text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-on-surface">{t("done.title")}</h2>
        <p className="text-sm text-on-surface-variant mt-1">{t("done.subtitle")}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button fullWidth onClick={() => navigate({ to: "/tickets" })}>
          <Ticket className="w-4 h-4" />
          {t("done.viewTickets")}
        </Button>
        <Button fullWidth variant="secondary" onClick={() => navigate({ to: "/dashboard" })}>
          {t("done.dashboard")}
        </Button>
      </div>
    </div>
  );
}

function Onboarding() {
  const { t } = useTranslation("onboarding");
  const STEPS = useSteps();
  const [step, setStep] = useState(0);

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
              {t("back")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
