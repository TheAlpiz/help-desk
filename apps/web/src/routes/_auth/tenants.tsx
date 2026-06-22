import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TenantsTable } from "../../features/super-admin/components/TenantsTable";

export const Route = createFileRoute("/_auth/tenants")({
  component: TenantsPage,
});

function TenantsPage() {
  const { t } = useTranslation("tenants");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
      <TenantsTable />
    </div>
  );
}
