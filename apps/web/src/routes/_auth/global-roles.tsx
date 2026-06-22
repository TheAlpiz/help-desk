import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GlobalRolesTable } from "../../features/super-admin/components/GlobalRolesTable";

export const Route = createFileRoute("/_auth/global-roles")({
  component: GlobalRolesPage,
});

function GlobalRolesPage() {
  const { t } = useTranslation("superAdmin");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("globalRoles.title")}</h1>
      <GlobalRolesTable />
    </div>
  );
}
