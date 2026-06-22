import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { useAppStore } from "@/store";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/notifications")({
  component: NotificationsList,
});

type FilterKey = "all" | "unread" | "read";

function NotificationsList() {
  const { t } = useTranslation("notifications");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { accessToken, tenantId } = useAppStore();
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("filter.all") },
    { key: "unread", label: t("filter.unread") },
    { key: "read", label: t("filter.read") },
  ];

  const TYPE_LABELS: Record<string, string> = {
    ticket_assigned: t("types.ticket_assigned"),
    ticket_reply: t("types.ticket_reply"),
    ticket_closed: t("types.ticket_closed"),
    sla_breach: t("types.sla_breach"),
    sla_escalation: t("types.sla_escalation", "SLA Escalation"),
    mention: t("types.mention"),
    task_assigned: t("types.task_assigned"),
    system: t("types.system"),
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.notifications.index.$get();
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return body;
    },
  });

  const all: any[] = (data as any)?.data ?? [];

  const markOneMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.notifications[":id"].read.$patch({
        param: { id },
        json: { isRead: true } as any,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = all.filter((n: any) => !n.isRead);
      await Promise.all(
        unread.map((n: any) =>
          api.notifications[":id"].read.$patch({
            param: { id: n.id },
            json: { isRead: true } as any,
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
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          {unreadCount > 0 && (
            <span className="inline-flex text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
              {t("unread", { count: unreadCount })}
            </span>
          )}
        </div>
        <button
          onClick={() => markAllMutation.mutate()}
          disabled={markAllMutation.isPending || unreadCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-surface-variant border border-outline-variant rounded-lg hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {markAllMutation.isPending ? t("marking") : t("markAllRead")}
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
              <option value="all">{t("filter.allTypes")}</option>
              {types.map((type: any) => (
                <option key={type} value={type}>{TYPE_LABELS[type] ?? type}</option>
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
              {all.length === 0 ? t("empty.allCaughtUp") : t("empty.noMatches")}
            </p>
            <p className="text-xs text-on-surface-variant/40 mt-1">
              {all.length === 0 ? t("empty.allCaughtUpSub") : t("empty.noMatchesSub")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.isRead) markOneMutation.mutate(n.id);
                  if (n.actionUrl) {
                    navigate({ to: n.actionUrl });
                  }
                }}
                className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                  !n.isRead
                    ? "bg-primary/5 hover:bg-primary/8 cursor-pointer"
                    : "hover:bg-white/3 cursor-pointer"
                }`}
                title={!n.isRead ? t("markRead") : undefined}
              >
                <div className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${!n.isRead ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-on-surface truncate">
                        {n.title ?? TYPE_LABELS[n.type] ?? n.type ?? t("types.notification")}
                      </p>
                      {n.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-on-surface-variant/50 border border-white/10 shrink-0">
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant/40 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                    {n.body ?? n.message ?? n.payload?.message ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <p className="text-[10px] text-on-surface-variant/30 text-right">
          {t("ofNotifications", { shown: notifications.length, total: all.length })}
        </p>
      )}
    </div>
  );
}
