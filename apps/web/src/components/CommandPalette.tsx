import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  LayoutDashboard,
  Ticket,
  ListChecks,
  Inbox,
  BarChart3,
  Users,
  Building2,
  Clock,
  Shield,
  Settings,
  Bell,
  FileText,
  User,
  CreditCard,
  MessageSquare,
  Key,
  Zap,
  X,
  Archive,
} from "lucide-react";
import { useAppStore } from "@/store";

type Command = {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  to: string;
  keywords?: string[];
};

const COMMANDS: Command[] = [
  { id: "dashboard", label: "Dashboard", group: "Navigate", icon: <LayoutDashboard className="w-4 h-4" />, to: "/dashboard" },
  { id: "tickets", label: "Tickets", group: "Navigate", icon: <Ticket className="w-4 h-4" />, to: "/tickets" },
  { id: "tasks", label: "Tasks", group: "Navigate", icon: <ListChecks className="w-4 h-4" />, to: "/tasks" },
  { id: "mailboxes", label: "Mailboxes", group: "Navigate", icon: <Inbox className="w-4 h-4" />, to: "/mailboxes" },
  { id: "reports", label: "Reports", group: "Navigate", icon: <BarChart3 className="w-4 h-4" />, to: "/reports" },
  { id: "notifications", label: "Notifications", group: "Navigate", icon: <Bell className="w-4 h-4" />, to: "/notifications" },
  { id: "archived", label: "Archived Tickets", group: "Navigate", icon: <Archive className="w-4 h-4" />, to: "/archived", keywords: ["closed", "resolved", "archive"] },
  { id: "search", label: "Global Search", group: "Navigate", icon: <Search className="w-4 h-4" />, to: "/search", keywords: ["find", "look", "query"] },
  { id: "profile", label: "My Profile", group: "Account", icon: <User className="w-4 h-4" />, to: "/profile" },
  { id: "security", label: "Security & Sessions", group: "Account", icon: <Shield className="w-4 h-4" />, to: "/account-security" },
  { id: "api-tokens", label: "API Tokens", group: "Account", icon: <Key className="w-4 h-4" />, to: "/api-tokens" },
  { id: "notif-prefs", label: "Notification Preferences", group: "Account", icon: <Bell className="w-4 h-4" />, to: "/notification-preferences" },
  { id: "users", label: "Users & Roles", group: "Admin", icon: <Users className="w-4 h-4" />, to: "/users" },
  { id: "departments", label: "Departments", group: "Admin", icon: <Building2 className="w-4 h-4" />, to: "/departments" },
  { id: "sla", label: "SLA Policies", group: "Admin", icon: <Clock className="w-4 h-4" />, to: "/sla" },
  { id: "roles", label: "Permissions & Roles", group: "Admin", icon: <Shield className="w-4 h-4" />, to: "/roles" },
  { id: "macros", label: "Macros / Canned Responses", group: "Admin", icon: <Zap className="w-4 h-4" />, to: "/macros" },
  { id: "automations", label: "Automation Rules", group: "Admin", icon: <Zap className="w-4 h-4" />, to: "/automations", keywords: ["rules", "trigger", "workflow"] },
  { id: "audit", label: "Audit Logs", group: "Admin", icon: <FileText className="w-4 h-4" />, to: "/audit-logs" },
  { id: "settings", label: "Settings", group: "Admin", icon: <Settings className="w-4 h-4" />, to: "/settings" },
  { id: "whatsapp", label: "WhatsApp", group: "Channels", icon: <MessageSquare className="w-4 h-4" />, to: "/whatsapp" },
  { id: "billing", label: "Billing", group: "Account", icon: <CreditCard className="w-4 h-4" />, to: "/billing" },
  { id: "onboarding", label: "Setup wizard", group: "Account", icon: <LayoutDashboard className="w-4 h-4" />, to: "/onboarding" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAppStore((s) => s.user);

  const isAdmin = user?.globalRole === "ADMIN" || user?.globalRole === "SUPER_ADMIN";

  const filtered = COMMANDS.filter((c) => {
    if (!isAdmin && c.group === "Admin") return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q) ||
      c.keywords?.some((k) => k.includes(q))
    );
  });

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  const execute = useCallback(
    (cmd: Command) => {
      setOpen(false);
      setQuery("");
      navigate({ to: cmd.to as any });
    },
    [navigate],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setSelected(0);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, flatFiltered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && flatFiltered[selected]) execute(flatFiltered[selected]);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, flatFiltered, selected, execute]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  if (!open) return null;

  let idx = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4" aria-modal="true" role="dialog" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <Search className="w-4 h-4 text-on-surface-variant/50 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or jump to…"
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-on-surface-variant/40 hover:text-on-surface transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 text-on-surface-variant/50 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <p className="text-xs text-on-surface-variant/40 text-center py-8">No results for "{query}"</p>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                  {group}
                </p>
                {cmds.map((cmd) => {
                  const i = idx++;
                  const isSelected = i === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(i)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                      }`}
                    >
                      <span className={isSelected ? "text-primary" : "text-on-surface-variant/50"}>{cmd.icon}</span>
                      {cmd.label}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-2 border-t border-outline-variant">
          <span className="text-[10px] text-on-surface-variant/30 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="text-[10px] text-on-surface-variant/30 flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↵</kbd>
            select
          </span>
          <span className="ml-auto text-[10px] text-on-surface-variant/20">⌘K</span>
        </div>
      </div>
    </div>
  );
}
