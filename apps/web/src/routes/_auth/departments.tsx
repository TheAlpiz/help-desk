import { createFileRoute } from "@tanstack/react-router";
import { DepartmentsTable } from "@/features/departments/components/DepartmentsTable";

export const Route = createFileRoute("/_auth/departments")({
  component: Departments,
});

function Departments() {
  return (
    <div className="space-y-4">
      <h1 className="text-[15px] font-semibold text-on-surface">Departments</h1>
      <DepartmentsTable />
    </div>
  );
}
