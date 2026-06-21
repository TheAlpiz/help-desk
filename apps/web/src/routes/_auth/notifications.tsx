import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { useAppStore } from "@/store";

export const Route = createFileRoute("/_auth/notifications")({
  component: NotificationsList,
});

const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
] as const;

type FilterKey = (typeof FILTER_OPTIONS)[number]["key"];

const TYPE_LABELS: Record<string, string> = {
  ticket_assigned: "Ticket Assigned",
  ticket_reply: "Ticket Reply",
  ticket_closed: "Ticket Closed",
  sla_breach: "SLA Breach",
  mention: "Mention",
  task_assigned: "Task Assigned",
  system: "System",
};

function NotificationsList() {
  const queryClient = useQueryClient();
  const { accessToken, tenantId } = useAppStore();
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const headers = {
    Authorization: `Bearer ${accessToken ?? ""}`,
    "X-Tenant-ID": tenantId ?? "",
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { headers });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  const all: any[] = (data as any)?.data ?? [];

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = all.filter((n: any) => !n.isRead);
      await Promise.all(
        unread.map((n: any) =>
          fetch(`/api/notifications/${n.id}/read`, {
            method: "PATCH",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ isRead: true }),
          }),
        ),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = all.filter((n: any) => !n.isRead).length;

  // Distinct types for type filter
  const types = Array.from(new Set(all.map((n: any) => n.type).filter(Boolean)));

  const notifications = all.filter((n: any) => {
    if (filterKey === "unread" && n.isRead) return false;
    if (filterKey === "read" && !n.isRead) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-semibold text-on-surface">Notifications</h1>
          {unreadCount > 0 && (
            <span className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
              {unreadCount} unread
            </span>
          )}
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || unreadCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {markAllMutation.isPending ? "Marking..." : "Mark all read"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-on-surface-variant/40 shrink-0" />
        <div className="flex items-center gap-1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterKey(f.key)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                filterKey === f.key
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary/25"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {types.length > 0 && (
          <>
            <span className="text-on-surface-variant/20 text-xs">|</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-surface-container-high border border-outline-variant rounded-lg text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
              aria-label="Filter by type"
            >
              <option value="all">All types</option>
              {types.map((t: any) => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load notifications.</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-on-surface">
              {all.length === 0 ? "All caught up" : "No matches"}
            </p>
            <p className="text-xs text-on-surface-variant/40 mt-1">
              {all.length === 0 ? "No notifications yet." : "Try a different filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markOneMutation.mutate(n.id);
                }}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  !n.isRead
                    ? "bg-primary/5 hover:bg-primary/8 cursor-pointer"
                    : "hover:bg-white/3"
                }`}
                title={!n.isRead ? "Click to mark as read" : undefined}
              >
                <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {TYPE_LABELS[n.type] ?? n.type ?? "Notification"}
                      </p>
                      {n.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant/50 border border-white/10 shrink-0">
                          {n.type}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant/40 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {n.message ?? n.payload?.message ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <p className="text-[10px] text-on-surface-variant/30 text-right">
          {notifications.length} of {all.length} notifications
        </p>
      )}
    </div>
  );
}
