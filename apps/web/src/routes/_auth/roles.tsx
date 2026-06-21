import { createFileRoute } from "@tanstack/react-router";
import { RolesTable } from "@/features/roles/components/RolesTable";

export const Route = createFileRoute("/_auth/roles")({
  component: Roles,
});

function Roles() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Permissions & Roles</h1>
      <RolesTable />
    </div>
  );
}
