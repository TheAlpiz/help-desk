import { createFileRoute } from "@tanstack/react-router";
import { Shield, FileSearch, Lock, Users, FileText, CheckCircle2 } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/compliance")({
  component: CompliancePage,
});

function CompliancePage() {
  const { t } = useTranslation("compliance");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
        <p className="text-xs text-on-surface-variant mt-1">{t("subtitle")}</p>
      </div>

      <ComingSoon
        icon={Shield}
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        features={[
          {
            icon: CheckCircle2,
            label: t("features.frameworkTracking.label"),
            description: t("features.frameworkTracking.description"),
          },
          {
            icon: Users,
            label: t("features.dataSubjectRequests.label"),
            description: t("features.dataSubjectRequests.description"),
          },
          {
            icon: Lock,
            label: t("features.legalHolds.label"),
            description: t("features.legalHolds.description"),
          },
          {
            icon: FileSearch,
            label: t("features.automatedChecks.label"),
            description: t("features.automatedChecks.description"),
          },
          {
            icon: FileText,
            label: t("features.auditReports.label"),
            description: t("features.auditReports.description"),
          },
        ]}
      />
    </div>
  );
}
