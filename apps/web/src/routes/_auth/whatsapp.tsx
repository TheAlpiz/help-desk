import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, Phone, Zap, Users, Link2, BarChart3, RefreshCw } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/whatsapp")({
  component: WhatsAppChannels,
});

function WhatsAppChannels() {
  const { t } = useTranslation("whatsapp");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          {t("subtitle")}
        </p>
      </div>

      <ComingSoon
        icon={MessageSquare}
        iconColor="text-[#25D366]"
        iconBg="bg-[#25D366]/10 border-[#25D366]/20"
        title={t("comingSoon.title")}
        description={t("comingSoon.description")}
        badge={t("comingSoon.badge")}
        eta={t("comingSoon.eta")}
        features={[
          {
            icon: Phone,
            label: t("comingSoon.features.multiNumber.label"),
            description: t("comingSoon.features.multiNumber.description"),
          },
          {
            icon: Zap,
            label: t("comingSoon.features.autoTicket.label"),
            description: t("comingSoon.features.autoTicket.description"),
          },
          {
            icon: RefreshCw,
            label: t("comingSoon.features.sessionWindow.label"),
            description: t("comingSoon.features.sessionWindow.description"),
          },
          {
            icon: Users,
            label: t("comingSoon.features.agentAssignment.label"),
            description: t("comingSoon.features.agentAssignment.description"),
          },
          {
            icon: Link2,
            label: t("comingSoon.features.templates.label"),
            description: t("comingSoon.features.templates.description"),
          },
          {
            icon: BarChart3,
            label: t("comingSoon.features.analytics.label"),
            description: t("comingSoon.features.analytics.description"),
          },
        ]}
      />
    </div>
  );
}
