import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GlobalUsersTable } from "../../features/super-admin/components/GlobalUsersTable";

export const Route = createFileRoute("/_auth/global-users")({
  component: GlobalUsersPage,
});

function GlobalUsersPage() {
  const { t } = useTranslation("superAdmin");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("globalUsers.title")}</h1>
      <GlobalUsersTable />
    </div>
  );
}
