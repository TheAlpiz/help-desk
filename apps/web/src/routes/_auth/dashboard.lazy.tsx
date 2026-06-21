import { createLazyFileRoute } from "@tanstack/react-router";
import { useAppStore } from "../../store";
import {
  AdminDashboard,
  SupervisorDashboard,
  AgentDashboard,
  RequesterDashboard,
} from "../../features/dashboard/Dashboards";

export const Route = createLazyFileRoute("/_auth/dashboard")({
  component: DashboardSwitchboard,
});

function DashboardSwitchboard() {
  const user = useAppStore((state) => state.user);

  if (!user) return null;

  switch (user.globalRole) {
    case "ADMIN":
    case "PLATFORM_OWNER":
      return <AdminDashboard />;
    case "SUPERVISOR":
      return <SupervisorDashboard />;
    case "AGENT":
      return <AgentDashboard />;
    case "REQUESTER":
    default:
      return <RequesterDashboard />;
  }
}
