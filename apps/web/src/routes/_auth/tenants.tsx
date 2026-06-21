import { createFileRoute } from "@tanstack/react-router";
import { TenantsTable } from "../../features/super-admin/components/TenantsTable";

export const Route = createFileRoute("/_auth/tenants")({
  component: TenantsPage,
});

function TenantsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Organizations</h1>
      <TenantsTable />
    </div>
  );
}
