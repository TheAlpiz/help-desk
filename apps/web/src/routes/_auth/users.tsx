import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { UsersTable } from "@/features/users/components/UsersTable";

export const Route = createFileRoute("/_auth/users")({
  component: UsersList,
});

function UsersList() {
  const { t } = useTranslation("users");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("table.pageTitle")}</h1>
      <UsersTable />
    </div>
  );
}
