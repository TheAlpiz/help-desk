import { createFileRoute } from "@tanstack/react-router";
import { UsersTable } from "@/features/users/components/UsersTable";

export const Route = createFileRoute("/_auth/users")({
  component: UsersList,
});

function UsersList() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Users & Roles</h1>
      <UsersTable />
    </div>
  );
}
