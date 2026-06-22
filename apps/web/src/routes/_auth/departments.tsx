import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DepartmentsTable } from "@/features/departments/components/DepartmentsTable";

export const Route = createFileRoute("/_auth/departments")({
  component: Departments,
});

function Departments() {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">{t("departments.title")}</h1>
      <DepartmentsTable />
    </div>
  );
}
