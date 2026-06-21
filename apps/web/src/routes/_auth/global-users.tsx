import { createFileRoute } from "@tanstack/react-router";
import { GlobalUsersTable } from "../../features/super-admin/components/GlobalUsersTable";

export const Route = createFileRoute("/_auth/global-users")({
  component: GlobalUsersPage,
});

function GlobalUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Global Users</h1>
      <GlobalUsersTable />
    </div>
  );
}
