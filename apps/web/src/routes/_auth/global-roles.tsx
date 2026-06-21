import { createFileRoute } from "@tanstack/react-router";
import { GlobalRolesTable } from "../../features/super-admin/components/GlobalRolesTable";

export const Route = createFileRoute("/_auth/global-roles")({
  component: GlobalRolesPage,
});

function GlobalRolesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Global Roles</h1>
      <GlobalRolesTable />
    </div>
  );
}
