import { createFileRoute } from "@tanstack/react-router";
import { Key, Shield, Zap, Code2, Lock, RefreshCw } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/api-tokens")({
  component: ApiTokens,
});

function ApiTokens() {
  const { t } = useTranslation("apiTokens");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          {t("subtitle")}
        </p>
      </div>

      <ComingSoon
        icon={Key}
        iconColor="text-amber-400"
        iconBg="bg-amber-400/10 border-amber-400/20"
        title={t("comingSoon.title")}
        description={t("comingSoon.description")}
        badge={t("comingSoon.badge")}
        eta={t("comingSoon.eta")}
        features={[
          {
            icon: Shield,
            label: t("comingSoon.features.scopes.label"),
            description: t("comingSoon.features.scopes.description"),
          },
          {
            icon: Lock,
            label: t("comingSoon.features.secure.label"),
            description: t("comingSoon.features.secure.description"),
          },
          {
            icon: Zap,
            label: t("comingSoon.features.revocation.label"),
            description: t("comingSoon.features.revocation.description"),
          },
          {
            icon: RefreshCw,
            label: t("comingSoon.features.lastUsed.label"),
            description: t("comingSoon.features.lastUsed.description"),
          },
          {
            icon: Code2,
            label: t("comingSoon.features.restAccess.label"),
            description: t("comingSoon.features.restAccess.description"),
          },
        ]}
      />
    </div>
  );
}
