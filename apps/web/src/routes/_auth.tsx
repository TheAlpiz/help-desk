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
  Archive,
  Zap,
  Download,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store";
import { cn } from "@/lib/utils";
import { RealtimeProvider } from "@/lib/RealtimeProvider";
import { bootstrapAuth, api } from "@/lib/api";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ForcePasswordChangeScreen } from "@/features/users/components/ForcePasswordChangeScreen";
import { AppLogo } from "@/components/AppLogo";

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
    roles: ["AGENT", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/notifications",
    labelKey: "main.notifications",
    icon: <Bell className="w-4 h-4" />,
  },
  {
    to: "/messages",
    labelKey: "main.messages",
    icon: <MessageSquare className="w-4 h-4" />,
  },
  {
    to: "/mailboxes",
    labelKey: "main.mailboxes",
    icon: <Inbox className="w-4 h-4" />,
    roles: ["AGENT", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/reports",
    labelKey: "main.reports",
    icon: <BarChart3 className="w-4 h-4" />,
    roles: ["AGENT", "ADMIN", "SUPER_ADMIN"],
  },
  {
    to: "/search",
    labelKey: "main.search",
    icon: <Search className="w-4 h-4" />,
  },
];

const ADMIN_NAV: NavItem[] = [
  {
    to: "/users",
    labelKey: "admin.users",
    icon: <Users className="w-4 h-4" />,
  },
  {
    to: "/departments",
    labelKey: "admin.departments",
    icon: <Building2 className="w-4 h-4" />,
  },
  { to: "/sla", labelKey: "admin.sla", icon: <Clock className="w-4 h-4" /> },
  {
    to: "/roles",
    labelKey: "admin.roles",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    to: "/macros",
    labelKey: "admin.macros",
    icon: <Key className="w-4 h-4" />,
  },
  {
    to: "/automations",
    labelKey: "admin.automations",
    icon: <Zap className="w-4 h-4" />,
  },
  {
    to: "/export",
    labelKey: "admin.export",
    icon: <Download className="w-4 h-4" />,
  },
  {
    to: "/compliance",
    labelKey: "admin.compliance",
    icon: <Shield className="w-4 h-4" />,
  },
  {
    to: "/audit-logs",
    labelKey: "admin.auditLog",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    to: "/settings",
    labelKey: "admin.settings",
    icon: <Settings className="w-4 h-4" />,
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

function NavLink({ item }: { item: NavItem }) {
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
      {t(item.labelKey)}
    </Link>
  );
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

  const notifications: any[] = (data as any)?.data ?? [];
  const unreadCount = (data as any)?.total ?? 0;

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
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
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

          <div className="max-h-80 overflow-y-auto">
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
                      !n.readAt && "bg-primary/5",
                    )}
                  >
                    <p className="text-xs font-medium text-on-surface leading-snug">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-on-surface-variant/60 mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
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
              <nav
                className="flex-1 overflow-y-auto pretty-scroll py-3 px-2"
                onClick={() => setMobileSidebarOpen(false)}
              >
                <div className="space-y-0.5">
                  {MAIN_NAV.filter(
                    (item) => !item.roles || item.roles.includes(user?.globalRole ?? "")
                  ).map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </div>
                {(user?.globalRole === "ADMIN" ||
                  user?.globalRole === "SUPER_ADMIN") && (
                  <>
                    <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                      {t("nav:admin.heading")}
                    </div>
                    <div className="space-y-0.5">
                      {ADMIN_NAV.map((item) => (
                        <NavLink key={item.to} item={item} />
                      ))}
                    </div>
                  </>
                )}
                {user?.globalRole === "SUPER_ADMIN" && (
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

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto pretty-scroll py-3 px-2">
            <div className="space-y-0.5">
              {MAIN_NAV.filter(
                (item) => !item.roles || item.roles.includes(user?.globalRole ?? "")
              ).map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
            </div>

            {isAdmin && (
              <>
                <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                  {t("nav:admin.heading")}
                </div>
                <div className="space-y-0.5">
                  {ADMIN_NAV.map((item) => (
                    <NavLink key={item.to} item={item} />
                  ))}
                </div>
              </>
            )}

            {isSuperAdmin && (
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
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {initials}
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
