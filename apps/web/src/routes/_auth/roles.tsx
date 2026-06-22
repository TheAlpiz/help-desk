import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RolesTable } from "@/features/roles/components/RolesTable";

export const Route = createFileRoute("/_auth/roles")({
  component: Roles,
});

function Roles() {
  const { t } = useTranslation("settings");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("roles.pageTitle")}</h1>
      <RolesTable />
    </div>
  );
}
