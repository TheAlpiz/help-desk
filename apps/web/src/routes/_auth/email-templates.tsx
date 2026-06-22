import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { authFetch } from "@/lib/api";
import { EmailSettings } from "@/features/email/EmailSettings";
import { EmailTemplateBuilder } from "@/features/email/EmailTemplateBuilder";
import { EmailApprovalQueue } from "@/features/email/EmailApprovalQueue";
import { SignatureRules } from "@/features/email/SignatureRules";
import { useAppStore } from "@/store";
import { Mail, FileText, PenTool, CheckSquare } from "lucide-react";

export const Route = createFileRoute("/_auth/email-templates")({
  validateSearch: z.object({ tab: z.string().optional() }),
  component: EmailTemplatesPage,
});

const ALL_TABS = ["templates", "signatures", "approval"] as const;
type TabKey = (typeof ALL_TABS)[number];

const ADMIN_TABS: TabKey[] = ["templates", "signatures", "approval"];
const AGENT_TABS: TabKey[] = ["signatures"];

const TAB_ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  templates: FileText,
  signatures: PenTool,
  approval: CheckSquare,
};

function EmailTemplatesPage() {
  const { t } = useTranslation("emailTemplates");
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const user = useAppStore((s) => s.user);

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.globalRole ?? "");
  const visibleTabs = isAdmin ? ADMIN_TABS : AGENT_TABS;

  const defaultTab = visibleTabs[0];
  const activeTab: TabKey =
    visibleTabs.includes(tab as TabKey) ? (tab as TabKey) : defaultTab;

  const setTab = (key: TabKey) =>
    navigate({ search: (prev) => ({ ...prev, tab: key }), replace: true });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-6 pt-6 pb-0 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-on-surface">
              {isAdmin ? t("page.title") : t("page.signaturesTitle")}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {isAdmin ? t("page.subtitle") : t("page.signaturesSubtitle")}
            </p>
          </div>
        </div>

        {/* Tab bar — only render if more than one tab is visible */}
        {visibleTabs.length > 1 && (
          <div className="flex gap-1 border-b border-outline-variant">
            {visibleTabs.map((key) => {
              const Icon = TAB_ICONS[key];
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(`tabs.${key}`)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto pretty-scroll px-6 py-6">
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">{t("templates.title")}</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">{t("templates.subtitle")}</p>
            </div>
            <EmailTemplateBuilder
              onSave={async (payload) => {
                const templates = await authFetch(`/api/email/templates`).then((r) => r.json());
                const existing = templates?.data?.find(
                  (t: any) => t.templateType === payload.contentJson?.templateType,
                );
                const templateId =
                  existing?.id ??
                  (
                    await authFetch(`/api/email/templates`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        type: payload.contentJson?.templateType ?? "ticket_created",
                        name: payload.contentJson?.templateType ?? "ticket_created",
                      }),
                    }).then((r) => r.json())
                  )?.data?.id;

                if (!templateId) return;
                await authFetch(`/api/email/templates/${templateId}/versions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
              }}
            />
          </div>
        )}

        {activeTab === "signatures" && (
          <div className="space-y-8">
            <EmailSettings />
            {isAdmin && (
              <div className="pt-4 border-t border-outline-variant">
                <SignatureRules />
              </div>
            )}
          </div>
        )}

        {activeTab === "approval" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-on-surface">{t("approval.title")}</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">{t("approval.subtitle")}</p>
            </div>
            <EmailApprovalQueue />
          </div>
        )}
      </div>
    </div>
  );
}
