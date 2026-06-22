import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Plus, X, Pencil, Trash2, Inbox, AlertTriangle, CheckCircle, WifiOff, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { createMailboxSchema, updateMailboxSchema } from "@help-desk/shared";
import { Button, Input, FormAlert, FormError, fieldErrors } from "@/components/ui";

export const Route = createFileRoute("/_auth/mailboxes")({
  component: MailboxesList,
});

type Mailbox = {
  id: string;
  organizationId: string;
  emailAddress: string;
  imapHost?: string | null;
  imapPort?: number | null;
  imapUser?: string | null;
  imapSecure: boolean;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpSecure: boolean;
  isActive: boolean;
  lastSyncAt?: string | null;
};

type MailboxFormValues = {
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  imapUser: string;
  imapPassword: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
};

// ─── Design tokens ────────────────────────────────────────────────────────────

// ─── Modal shell ──────────────────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-outline-variant shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
            {subtitle && (
              <p className="text-xs text-on-surface-variant/50 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── Form fields ──────────────────────────────────────────────────────────────

function MailboxFormFields({ form }: { form: any }) {
  const { t } = useTranslation("mailboxes");
  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-on-surface">{t("fields.email")} *</label>
        <form.Field
          name="emailAddress"
          validators={{ onChange: createMailboxSchema.shape.emailAddress }}
          children={(field: any) => (
            <>
              <Input
                dense
                type="email"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e: any) => field.handleChange(e.target.value)}
                placeholder="support@company.com"
              />
              <FormError>{fieldErrors(field.state.meta.errors)}</FormError>
            </>
          )}
        />
      </div>

      {/* IMAP */}
      <div className="border-t border-outline-variant pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          IMAP — Incoming
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.imapHost")}</label>
            <form.Field
              name="imapHost"
              children={(field: any) => (
                <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="imap.gmail.com" />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.imapPort")}</label>
            <form.Field
              name="imapPort"
              children={(field: any) => (
                <Input dense type="number" value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(Number(e.target.value))} placeholder="993" />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.username")}</label>
            <form.Field
              name="imapUser"
              children={(field: any) => (
                <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="user@company.com" />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.password")}</label>
            <form.Field
              name="imapPassword"
              children={(field: any) => (
                <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="App password" />
              )}
            />
          </div>
        </div>
        <form.Field
          name="imapSecure"
          children={(field: any) => (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(e: any) => field.handleChange(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant accent-primary"
              />
              <span className="text-xs text-on-surface-variant">{t("fields.useSSL")}</span>
            </label>
          )}
        />
      </div>

      {/* SMTP */}
      <div className="border-t border-outline-variant pt-4 space-y-3">
        <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
          SMTP — Outgoing
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.smtpHost")}</label>
            <form.Field
              name="smtpHost"
              children={(field: any) => (
                <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="smtp.gmail.com" />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.smtpPort")}</label>
            <form.Field
              name="smtpPort"
              children={(field: any) => (
                <Input dense type="number" value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(Number(e.target.value))} placeholder="587" />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.username")}</label>
            <form.Field
              name="smtpUser"
              children={(field: any) => (
                <Input dense value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="user@company.com" />
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-on-surface-variant/60">{t("fields.password")}</label>
            <form.Field
              name="smtpPassword"
              children={(field: any) => (
                <Input dense type="password" value={field.state.value} onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="App password" />
              )}
            />
          </div>
        </div>
        <form.Field
          name="smtpSecure"
          children={(field: any) => (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(e: any) => field.handleChange(e.target.checked)}
                className="w-4 h-4 rounded border-outline-variant accent-primary"
              />
              <span className="text-xs text-on-surface-variant">{t("fields.useSSL")}</span>
            </label>
          )}
        />
      </div>
    </div>
  );
}

// ─── Connect modal ────────────────────────────────────────────────────────────

function ConnectMailboxModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const tenantId = useAppStore((s) => s.tenantId);
  const { t } = useTranslation("mailboxes");

  const form = useForm({
    defaultValues: {
      emailAddress: "",
      imapHost: "",
      imapPort: 993,
      imapUser: "",
      imapPassword: "",
      imapSecure: true,
      smtpHost: "",
      smtpPort: 587,
      smtpUser: "",
      smtpPassword: "",
      smtpSecure: true,
    } satisfies MailboxFormValues,
    validators: { onChange: (createMailboxSchema as any).omit({ organizationId: true }) },
    onSubmit: async ({ value }) => {
      setError(null);
      if (!tenantId) { setError("No tenant context"); return; }
      try {
        const payload: Record<string, unknown> = {
          organizationId: tenantId,
          emailAddress: value.emailAddress,
          imapSecure: value.imapSecure,
          smtpSecure: value.smtpSecure,
        };
        if (value.imapHost) payload.imapHost = value.imapHost;
        if (value.imapPort) payload.imapPort = value.imapPort;
        if (value.imapUser) payload.imapUser = value.imapUser;
        if (value.imapPassword) payload.imapPassword = value.imapPassword;
        if (value.smtpHost) payload.smtpHost = value.smtpHost;
        if (value.smtpPort) payload.smtpPort = value.smtpPort;
        if (value.smtpUser) payload.smtpUser = value.smtpUser;
        if (value.smtpPassword) payload.smtpPassword = value.smtpPassword;

        const res = await api.mailboxes.index.$post({ json: payload as any });
        const body = await res.json() as any;
        if (!res.ok) {
          setError(body?.error?.message || body?.message || "Failed to connect mailbox");
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
        onClose();
      } catch (err: any) {
        setError(err.message || "An error occurred");
      }
    },
  });

  return (
    <ModalShell title={t("connect")} subtitle="Add IMAP/SMTP mailbox to ingest and send emails." onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
        <div className="mx-5 mt-4">
          <FormAlert>{error ?? undefined}</FormAlert>
        </div>
        <MailboxFormFields form={form} />
        <div className="flex gap-2 justify-end px-5 pb-5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe
            selector={(s: any) => [s.canSubmit, s.isSubmitting]}
            children={([canSubmit, isSubmitting]: any) => (
              <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
                {!isSubmitting && t("connect")}
              </Button>
            )}
          />
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditMailboxModal({ mailbox, onClose }: { mailbox: Mailbox; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation("mailboxes");

  const form = useForm({
    defaultValues: {
      emailAddress: mailbox.emailAddress,
      imapHost: mailbox.imapHost ?? "",
      imapPort: mailbox.imapPort ?? 993,
      imapUser: mailbox.imapUser ?? "",
      imapPassword: "",
      imapSecure: mailbox.imapSecure,
      smtpHost: mailbox.smtpHost ?? "",
      smtpPort: mailbox.smtpPort ?? 587,
      smtpUser: mailbox.smtpUser ?? "",
      smtpPassword: "",
      smtpSecure: mailbox.smtpSecure,
    } satisfies MailboxFormValues,
    validators: { onChange: updateMailboxSchema as any },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const payload: Record<string, unknown> = {
          emailAddress: value.emailAddress,
          imapSecure: value.imapSecure,
          smtpSecure: value.smtpSecure,
        };
        if (value.imapHost) payload.imapHost = value.imapHost;
        if (value.imapPort) payload.imapPort = value.imapPort;
        if (value.imapUser) payload.imapUser = value.imapUser;
        if (value.imapPassword) payload.imapPassword = value.imapPassword;
        if (value.smtpHost) payload.smtpHost = value.smtpHost;
        if (value.smtpPort) payload.smtpPort = value.smtpPort;
        if (value.smtpUser) payload.smtpUser = value.smtpUser;
        if (value.smtpPassword) payload.smtpPassword = value.smtpPassword;

        const res = await api.mailboxes[":id"].$put({ param: { id: mailbox.id }, json: payload as any });
        const body = await res.json() as any;
        if (!res.ok) {
          setError(body?.error?.message || body?.message || "Failed to update mailbox");
          return;
        }
        queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
        onClose();
      } catch (err: any) {
        setError(err.message || "An error occurred");
      }
    },
  });

  return (
    <ModalShell title={t("edit")} subtitle={mailbox.emailAddress} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
        <div className="mx-5 mt-4">
          <FormAlert>{error ?? undefined}</FormAlert>
        </div>
        <MailboxFormFields form={form} />
        <div className="flex gap-2 justify-end px-5 pb-5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <form.Subscribe
            selector={(s: any) => [s.canSubmit, s.isSubmitting]}
            children={([canSubmit, isSubmitting]: any) => (
              <Button type="submit" disabled={!canSubmit} loading={isSubmitting}>
                {!isSubmitting && "Save Changes"}
              </Button>
            )}
          />
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteMailboxModal({ mailbox, onClose }: { mailbox: Mailbox; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("mailboxes");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.mailboxes[":id"].$delete({ param: { id: mailbox.id } });
      const body = await res.json() as any;
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-on-surface">{t("actions.disconnect")}</h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {t("actions.disconnect")}{" "}
          <span className="font-semibold text-on-surface">{mailbox.emailAddress}</span>?
          It will stop ingesting and sending emails.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && t("actions.disconnect")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Mailbox health indicator ─────────────────────────────────────────────────

function MailboxHealth({ mb }: { mb: Mailbox }) {
  const { t } = useTranslation("mailboxes");

  if (!mb.isActive) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-white/8 text-on-surface-variant border-white/10">
        <WifiOff className="w-3 h-3" />
        {t("status.disconnected")}
      </span>
    );
  }

  const stale = mb.lastSyncAt && Date.now() - new Date(mb.lastSyncAt).getTime() > 30 * 60 * 1000;

  if (stale) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-500/15 text-amber-300 border-amber-500/20">
        <AlertTriangle className="w-3 h-3" />
        Stale
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
      <CheckCircle className="w-3 h-3" />
      {t("status.connected")}
    </span>
  );
}

// ─── Mailboxes list ───────────────────────────────────────────────────────────

function TestConnectionButton({ mailboxId }: { mailboxId: string }) {
  const { success, error: toastError } = useToast();
  const { t } = useTranslation("mailboxes");
  const [testing, setTesting] = useState(false);

  const test = async () => {
    setTesting(true);
    try {
      const res = await api.mailboxes[":id"].test.$post({ param: { id: mailboxId } });
      if (res.ok) {
        success("Connection successful");
      } else {
        toastError("Connection failed — check IMAP/SMTP credentials");
      }
    } catch {
      toastError("Connection test failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <button
      onClick={test}
      disabled={testing}
      title={t("actions.test")}
      className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 disabled:opacity-40 transition-colors"
    >
      <Zap className={`w-3.5 h-3.5 ${testing ? "animate-pulse" : ""}`} />
    </button>
  );
}

function MailboxesList() {
  const [showConnect, setShowConnect] = useState(false);
  const [editMailbox, setEditMailbox] = useState<Mailbox | null>(null);
  const [deleteMailbox, setDeleteMailbox] = useState<Mailbox | null>(null);
  const { t } = useTranslation("mailboxes");

  const { data, isLoading, error } = useQuery({
    queryKey: ["mailboxes"],
    queryFn: async () => {
      const res = await api.mailboxes.index.$get();
      if (!res.ok) throw new Error("Failed to fetch mailboxes");
      return res.json();
    },
  });

  const mailboxes: Mailbox[] = (data as any)?.data ?? [];

  return (
    <>
      {showConnect && <ConnectMailboxModal onClose={() => setShowConnect(false)} />}
      {editMailbox && <EditMailboxModal mailbox={editMailbox} onClose={() => setEditMailbox(null)} />}
      {deleteMailbox && <DeleteMailboxModal mailbox={deleteMailbox} onClose={() => setDeleteMailbox(null)} />}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          <Button onClick={() => setShowConnect(true)}>
            <Plus className="w-4 h-4" />
            {t("connect")}
          </Button>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-error text-sm">Failed to load mailboxes.</div>
          ) : mailboxes.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Inbox className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-on-surface mb-1">{t("empty.title")}</p>
              <p className="text-xs text-on-surface-variant/40">
                {t("empty.subtitle")}
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                    {t("fields.email")}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">
                    IMAP
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden md:table-cell">
                    SMTP
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                    {t("fields.status")}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider hidden lg:table-cell">
                    Last Sync
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {mailboxes.map((mb) => (
                  <tr key={mb.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-on-surface">
                      {mb.emailAddress}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant/60 hidden md:table-cell">
                      {mb.imapHost ? `${mb.imapHost}:${mb.imapPort}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant/60 hidden md:table-cell">
                      {mb.smtpHost ? `${mb.smtpHost}:${mb.smtpPort}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <MailboxHealth mb={mb} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-on-surface-variant/50 hidden lg:table-cell">
                      {mb.lastSyncAt ? new Date(mb.lastSyncAt).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TestConnectionButton mailboxId={mb.id} />
                        <button
                          onClick={() => setEditMailbox(mb)}
                          className="p-1.5 rounded text-on-surface-variant/50 hover:text-on-surface hover:bg-white/5 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteMailbox(mb)}
                          className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors"
                          title={t("actions.disconnect")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
