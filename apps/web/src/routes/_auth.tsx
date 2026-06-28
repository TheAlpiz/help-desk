import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  ListChecks,
  Bell,
  Inbox,
  BarChart3,
  Users,
  Building2,
  Clock,
  Shield,
  Settings,
  Globe,
  UserCog,
  Key,
  LogOut,
  ChevronDown,
  FileText,
  User,
  CreditCard,
  MessageSquare,
  X,
  Menu,
  Search,
  Filter,
  ChevronsUpDown,
  Check,
  Archive,
  Zap,
  Download,
  Loader2,
  Mail,
  PenTool,
  StickyNote,
  GitBranch,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store";
import { cn } from "@/lib/utils";
import { RealtimeProvider } from "@/lib/RealtimeProvider";
import { notifTitle, notifBody } from "@/lib/notificationText";
import { bootstrapAuth, api } from "@/lib/api";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ForcePasswordChangeScreen } from "@/features/users/components/ForcePasswordChangeScreen";
import { AppLogo } from "@/components/AppLogo";
import { AVAILABILITY_ORDER, availabilityMeta } from "@/lib/presence";
import { useMyDepartments } from "@/lib/useWorkspace";

export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    // Access token is memory-only, so after a page refresh the store is empty.
    // Try a silent cookie-based refresh + /me rehydration before bouncing to login.
    let user = useAppStore.getState().user;
    if (!user) {
      const restored = await bootstrapAuth();
      user = restored ? useAppStore.getState().user : null;
    }
    if (!user) {
      throw redirect({
        to: "/login",
        search: { returnTo: location.href },
      });
    }
  },
  component: AuthLayout,
  // beforeLoad awaits a refresh + /me roundtrip on a cold load; show a spinner
  // immediately instead of a blank white screen.
  pendingMs: 0,
  pendingComponent: () => (
    <div className="flex h-[100dvh] items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  ),
});

// ─── Nav item config ──────────────────────────────────────────────────────────

type NavItem = {
  to: string;
  labelKey: string; // key in nav namespace
  icon: React.ReactNode;
  exact?: boolean;
  roles?: string[];
};

const MAIN_NAV: NavItem[] = [
  {
    to: "/dashboard",
    labelKey: "main.dashboard",
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    to: "/tickets",
    labelKey: "main.tickets",
    icon: <Ticket className="w-4 h-4" />,
  },
  {
    to: "/archived",
    labelKey: "main.archived",
    icon: <Archive className="w-4 h-4" />,
  },
  {
    to: "/tasks",
    labelKey: "main.tasks",
    icon: <ListChecks className="w-4 h-4" />,
    roles: ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/messages",
    labelKey: "main.messages",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    // mailbox.manage is admin-only (org email-account config)
    to: "/mailboxes",
    labelKey: "main.mailboxes",
    icon: <Inbox className="w-4 h-4" />,
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/reports",
    labelKey: "main.reports",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    // Personal action — any member connects their own GitHub + links repos to tasks.
    to: "/github",
    labelKey: "main.github",
    icon: <GitBranch className="w-4 h-4" />,
    roles: ["AGENT", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/search",
    labelKey: "main.search",
    icon: <Search className="w-4 h-4" />,
  },
];

// "My Space" (personal workspace) — a deliberately slim nav. The user only ever
// sees their own tickets/tasks here (enforced by the backend scope guard).
const PERSONAL_NAV: NavItem[] = [
  { to: "/tickets", labelKey: "main.tickets", icon: <Ticket className="w-4 h-4" /> },
  { to: "/tasks", labelKey: "main.tasks", icon: <ListChecks className="w-4 h-4" /> },
  { to: "/notes", labelKey: "user.notes", icon: <StickyNote className="w-4 h-4" /> },
  { to: "/messages", labelKey: "main.messages", icon: <MessageSquare className="w-4 h-4" /> },
];

// roles mirror the backend permission each page's endpoints require:
//   users(user.*) / departments(department.manage) / roles(role.manage) /
//   compliance+settings(organization.manage) / email-templates(template.manage) → ADMIN
//   sla(sla.manage) / macros+automations(ticket.update) / export(export.read) /
//   audit-logs(audit.read) → also SUPERVISOR
const SUPERVISOR_PLUS = ["SUPERVISOR", "ADMIN", "SUPER_ADMIN"];
const ADMIN_ONLY = ["ADMIN", "SUPER_ADMIN"];

const ADMIN_NAV: NavItem[] = [
  {
    to: "/users",
    labelKey: "admin.users",
    icon: <Users className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  {
    to: "/departments",
    labelKey: "admin.departments",
    icon: <Building2 className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  { to: "/sla", labelKey: "admin.sla", icon: <Clock className="w-4 h-4" />, roles: SUPERVISOR_PLUS },
  {
    to: "/roles",
    labelKey: "admin.roles",
    icon: <Shield className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  {
    to: "/macros",
    labelKey: "admin.macros",
    icon: <Key className="w-4 h-4" />,
    roles: SUPERVISOR_PLUS,
  },
  {
    to: "/automations",
    labelKey: "admin.automations",
    icon: <Zap className="w-4 h-4" />,
    roles: SUPERVISOR_PLUS,
  },
  {
    to: "/ticket-filters",
    labelKey: "admin.ticketFilters",
    icon: <Filter className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  {
    to: "/export",
    labelKey: "admin.export",
    icon: <Download className="w-4 h-4" />,
    roles: SUPERVISOR_PLUS,
  },
  {
    to: "/compliance",
    labelKey: "admin.compliance",
    icon: <Shield className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  {
    to: "/audit-logs",
    labelKey: "admin.auditLog",
    icon: <FileText className="w-4 h-4" />,
    roles: SUPERVISOR_PLUS,
  },
  {
    to: "/email-templates",
    labelKey: "admin.emailTemplates",
    icon: <Mail className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
  {
    to: "/settings",
    labelKey: "admin.settings",
    icon: <Settings className="w-4 h-4" />,
    roles: ADMIN_ONLY,
  },
];

const SUPER_NAV: NavItem[] = [
  {
    to: "/tenants",
    labelKey: "super.organizations",
    icon: <Globe className="w-4 h-4" />,
  },
  {
    to: "/global-users",
    labelKey: "super.globalUsers",
    icon: <UserCog className="w-4 h-4" />,
  },
  {
    to: "/global-roles",
    labelKey: "super.globalRoles",
    icon: <Key className="w-4 h-4" />,
  },
];

// ─── Sidebar link ─────────────────────────────────────────────────────────────

function NavLink({ item, badge }: { item: NavItem; badge?: number }) {
  const { t } = useTranslation("nav");
  return (
    <Link
      to={item.to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      activeProps={{ className: "bg-primary/10 text-primary" }}
      inactiveProps={{
        className:
          "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
      }}
    >
      {item.icon}
      <span className="flex-1 truncate">{t(item.labelKey)}</span>
      {badge != null && badge > 0 && (
        <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

// Active (non-terminal) ticket statuses for the "assigned to me" sidebar badge.
const ACTIVE_TICKET_STATUSES = "open,assigned,in_progress,waiting_customer,reopened";
const ACTIVE_TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED"];

// Live counts shown as sidebar badges, keyed by nav `to` path:
//   /tickets  → active tickets assigned to me
//   /tasks    → active tasks assigned to me
//   /messages → unread chat messages
function useNavBadges(userId: string | undefined): Record<string, number> {
  const enabled = !!userId;

  const tickets = useQuery({
    queryKey: ["nav-badge", "tickets", userId],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await api.tickets.index.$get({
        query: { assigneeId: userId!, status: ACTIVE_TICKET_STATUSES, limit: "1" },
      });
      const body = (await res.json()) as any;
      return res.ok ? Number(body?.data?.total ?? 0) : 0;
    },
  });

  const tasks = useQuery({
    queryKey: ["nav-badge", "tasks", userId],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await api.tasks.index.$get({
        query: { assigneeId: userId!, limit: "100" },
      });
      const body = (await res.json()) as any;
      if (!res.ok) return 0;
      const rows: any[] = body?.data?.data ?? [];
      return rows.filter((row) => ACTIVE_TASK_STATUSES.includes(row.status)).length;
    },
  });

  const messages = useQuery({
    queryKey: ["nav-badge", "messages", userId],
    enabled,
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await api.conversations.index.$get();
      const body = (await res.json()) as any;
      if (!res.ok) return 0;
      const rows: any[] = body?.data ?? [];
      return rows.reduce((sum, c) => sum + (Number(c.unreadCount) || 0), 0);
    },
  });

  return {
    "/tickets": tickets.data ?? 0,
    "/tasks": tasks.data ?? 0,
    "/messages": messages.data ?? 0,
  };
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function NotificationBell() {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: async () => {
      const res = await api.notifications.index.$get({
        query: { limit: "10", unreadOnly: "true" },
      });
      const body = (await res.json()) as any;
      if (!res.ok) return { data: [], total: 0 };
      return body;
    },
    refetchInterval: 30_000,
  });

  const allNotifications: any[] = (data as any)?.data ?? [];
  const notifications = allNotifications.filter((n: any) => !n.isRead);
  const unreadCount = notifications.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-80 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
            <span className="text-sm font-semibold text-on-surface">
              {t("notifications.title")}
            </span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-error/15 text-error border border-error/20">
                  {unreadCount}
                </span>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-on-surface-variant/40 hover:text-on-surface transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto pretty-scroll">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-6 h-6 text-on-surface-variant/20 mx-auto mb-2" />
                <p className="text-xs text-on-surface-variant/50">
                  {t("notifications.allCaughtUp")}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-4 py-3 transition-colors hover:bg-white/3",
                      !n.isRead && "bg-primary/5",
                    )}
                  >
                    <p className="text-xs font-medium text-on-surface leading-snug">
                      {notifTitle(n)}
                    </p>
                    {notifBody(n) && (
                      <p className="text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed line-clamp-2">
                        {notifBody(n)}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-on-surface-variant/30 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-outline-variant px-4 py-2.5">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              {t("notifications.viewAll")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailVerificationBanner() {
  const { t } = useTranslation("nav");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    setSending(true);
    try {
      await api.auths["request-verification"].$post({ json: {} as any });
      setSent(true);
    } catch {
      /* best-effort */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400/90">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
        {sent ? t("verifyEmail.sent") : t("verifyEmail.message")}
      </div>
      {!sent && (
        <button
          onClick={resend}
          disabled={sending}
          className="shrink-0 font-medium text-amber-300 hover:text-amber-200 disabled:opacity-50 transition-colors"
        >
          {sending ? t("verifyEmail.sending") : t("verifyEmail.resend")}
        </button>
      )}
    </div>
  );
}

// ─── Workspace switcher ─────────────────────────────────────────────────────
// Toggles between "My Space" (personal) and "Corporate". In Corporate the user
// can additionally narrow to one of their departments (or the whole org).
function WorkspaceSwitcher() {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mode = useAppStore((s) => s.workspaceMode);
  const deptId = useAppStore((s) => s.workspaceDeptId);
  const setWorkspace = useAppStore((s) => s.setWorkspace);
  const { data: departments = [] } = useMyDepartments();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentDept = departments.find((d) => d.id === deptId);
  const label =
    mode === "personal"
      ? t("workspace.personal")
      : currentDept
        ? currentDept.name
        : t("workspace.allOrg");
  const subLabel = mode === "personal" ? t("workspace.personal") : t("workspace.corporate");

  const choose = (m: "personal" | "corporate", id: string | null = null) => {
    setWorkspace(m, id);
    setOpen(false);
  };

  const Row = ({
    active,
    onClick,
    icon,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left",
        active
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
      )}
    >
      <span className="w-4 h-4 shrink-0 flex items-center justify-center">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {active && <Check className="w-3.5 h-3.5 shrink-0" />}
    </button>
  );

  return (
    <div ref={ref} className="relative px-2 pt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-white/5 transition-colors text-left"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            mode === "personal" ? "bg-primary/15 text-primary" : "bg-primary text-on-primary",
          )}
        >
          {mode === "personal" ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-on-surface truncate">{label}</p>
          <p className="text-[10px] text-on-surface-variant/60 truncate">{subLabel}</p>
        </div>
        <ChevronsUpDown className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 bg-surface-container-high border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50 py-1">
          <Row
            active={mode === "personal"}
            onClick={() => choose("personal")}
            icon={<User className="w-4 h-4" />}
          >
            {t("workspace.personal")}
          </Row>

          <div className="border-t border-outline-variant my-1" />
          <div className="px-3 pt-1 pb-1 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
            {t("workspace.corporate")}
          </div>
          <Row
            active={mode === "corporate" && !deptId}
            onClick={() => choose("corporate", null)}
            icon={<Building2 className="w-4 h-4" />}
          >
            {t("workspace.allOrg")}
          </Row>
          {departments.map((d) => (
            <Row
              key={d.id}
              active={mode === "corporate" && deptId === d.id}
              onClick={() => choose("corporate", d.id)}
              icon={<Building2 className="w-4 h-4 opacity-60" />}
            >
              {d.name}
            </Row>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthLayout() {
  const { t } = useTranslation(["nav", "common"]);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Offline detection
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // 401 handling + token refresh is centralized in authFetch; no global patch needed.

  const handleLogout = async () => {
    // Revoke the server session + clear cookies, then drop in-memory state.
    try {
      await api.auths.logout.$post({ json: {} as any });
    } catch {
      /* best-effort; clear locally regardless */
    }
    logout();
    navigate({ to: "/login" });
  };

  const isAdmin =
    user?.globalRole === "ADMIN" || user?.globalRole === "SUPER_ADMIN";
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";

  const role = user?.globalRole ?? "";
  const workspaceMode = useAppStore((s) => s.workspaceMode);
  const isPersonal = workspaceMode === "personal";
  const visibleMainNav = MAIN_NAV.filter((item) => !item.roles || item.roles.includes(role));
  const visibleAdminNav = ADMIN_NAV.filter((item) => !item.roles || item.roles.includes(role));
  // My Space collapses the sidebar to the four personal pages; Corporate shows
  // the full role-filtered nav (main + admin + super sections).
  const mainNav = isPersonal ? PERSONAL_NAV : visibleMainNav;
  const showAdminNav = !isPersonal && visibleAdminNav.length > 0;
  const showSuperNav = !isPersonal && isSuperAdmin;
  const navBadges = useNavBadges(user?.id);

  const setMyAvailability = useAppStore((s) => s.setMyAvailability);
  const myAvailability = user?.availability ?? "available";
  const changeAvailability = async (a: string) => {
    if (a === myAvailability) return;
    setMyAvailability(a); // optimistic
    try {
      await api.users.me.availability.$put({ json: { availability: a as any } });
    } catch {
      /* best-effort; presence broadcast reconciles */
    }
  };

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  const location = useLocation();
  const isOnboarding = location.pathname.includes("/onboarding");

  if (isOnboarding) {
    return (
      <RealtimeProvider>
        <div className="flex h-[100dvh] bg-background overflow-auto">
          <main className="flex-1 min-w-0">
            {isOffline && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                {t("common:offline")}
              </div>
            )}
            <ErrorBoundary inline>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </RealtimeProvider>
    );
  }

  if (user?.forcePasswordChange) {
    return <ForcePasswordChangeScreen />;
  }

  return (
    <RealtimeProvider>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        {/* ── Mobile sidebar overlay ───────────────────────────────── */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="relative z-10 w-56 flex flex-col border-r border-outline-variant bg-surface-container-low h-full">
              <div className="h-12 flex items-center justify-between px-4 border-b border-outline-variant shrink-0">
                <AppLogo className="h-7 w-auto" />
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="text-on-surface-variant/50 hover:text-on-surface"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <WorkspaceSwitcher />
              <nav
                className="flex-1 overflow-y-auto pretty-scroll py-3 px-2"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <div className="space-y-0.5">
                  {mainNav.map((item) => (
                    <NavLink key={item.to} item={item} badge={navBadges[item.to]} />
                  ))}
                </div>
                {showAdminNav && (
                  <>
                    <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                      {t("nav:admin.heading")}
                    </div>
                    <div className="space-y-0.5">
                      {visibleAdminNav.map((item) => (
                        <NavLink key={item.to} item={item} />
                      ))}
                    </div>
                  </>
                )}
                {showSuperNav && (
                  <>
                    <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                      {t("nav:super.heading")}
                    </div>
                    <div className="space-y-0.5">
                      {SUPER_NAV.map((item) => (
                        <NavLink key={item.to} item={item} />
                      ))}
                    </div>
                  </>
                )}
              </nav>
            </aside>
          </div>
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low">
          {/* Logo */}
          <div className="h-12 flex items-center px-4 border-b border-outline-variant shrink-0">
            <AppLogo className="h-7 w-auto" />
          </div>

          {/* Workspace switcher */}
          <WorkspaceSwitcher />

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto pretty-scroll py-3 px-2">
            <div className="space-y-0.5">
              {mainNav.map((item) => (
                <NavLink key={item.to} item={item} badge={navBadges[item.to]} />
              ))}
            </div>

            {showAdminNav && (
              <>
                <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                  {t("nav:admin.heading")}
                </div>
                <div className="space-y-0.5">
                  {visibleAdminNav.map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </div>
              </>
            )}

            {showSuperNav && (
              <>
                <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                  {t("nav:super.heading")}
                </div>
                <div className="space-y-0.5">
                  {SUPER_NAV.map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </div>
              </>
            )}
          </nav>

          {/* Language */}
          <div className="px-3 pb-2 shrink-0">
            <LanguageSwitcher variant="inline" className="justify-center" />
          </div>

          {/* User */}
          <div className="border-t border-outline-variant p-2 shrink-0">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
              >
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">
                    {initials}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-container-low",
                      availabilityMeta(myAvailability).dot,
                    )}
                    title={availabilityMeta(myAvailability).fallback}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-on-surface truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] text-on-surface-variant/60 truncate capitalize">
                    {user?.globalRole?.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-on-surface-variant/40 transition-transform shrink-0",
                    userMenuOpen && "rotate-180",
                  )}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-container-high border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50">
                  {/* Availability (Discord-style status) */}
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                    {t("nav:presence.heading", "Status")}
                  </div>
                  {AVAILABILITY_ORDER.map((a) => {
                    const meta = availabilityMeta(a);
                    const active = a === myAvailability;
                    return (
                      <button
                        key={a}
                        onClick={() => changeAvailability(a)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                          active ? "bg-white/5 text-on-surface" : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                        )}
                      >
                        <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", meta.dot)} />
                        {t(`nav:${meta.labelKey}`, meta.fallback)}
                        {active && <span className="ml-auto text-[10px] text-primary">●</span>}
                      </button>
                    );
                  })}
                  <div className="border-t border-outline-variant" />
                  <Link
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    {t("nav:user.profile")}
                  </Link>
                  <Link
                    to="/api-tokens"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    {t("nav:user.apiTokens")}
                  </Link>
                  <Link
                    to="/notes"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    {t("nav:user.notes", "My Notes")}
                  </Link>
                  {!isAdmin && (
                    <Link
                      to="/email-templates"
                      search={{ tab: "signatures" }}
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      {t("nav:user.mySignature")}
                    </Link>
                  )}
                  <Link
                    to="/whatsapp"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/billing"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      {t("nav:user.billing")}
                    </Link>
                  )}
                  <div className="border-t border-outline-variant" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-error hover:bg-error-container/20 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("nav:user.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-12 flex items-center justify-between px-4 lg:px-6 border-b border-outline-variant bg-background shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => {
                  document.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: "k",
                      ctrlKey: true,
                      bubbles: true,
                    }),
                  );
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant/50 hover:text-on-surface hover:border-outline transition-colors text-xs"
                aria-label="Open command palette"
              >
                <Search className="w-3.5 h-3.5" />
                Search…
                <kbd className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  ⌘K
                </kbd>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto bg-background">
            {user && user.emailVerified === false && <EmailVerificationBanner />}
            {isOffline && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-400/90">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                {t("common:offline")}
              </div>
            )}
            <div className="p-6">
              <ErrorBoundary inline>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </RealtimeProvider>
  );
}
