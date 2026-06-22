import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_auth/notification-preferences")({
  component: NotificationPreferences,
});

type Channel = "IN_APP" | "EMAIL";

function ChannelToggle({
  enabled,
  onChange,
  icon: Icon,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      title={label}
      className={`p-1.5 rounded-md transition-colors ${
        enabled
          ? "bg-primary/15 text-primary border border-primary/25"
          : "text-on-surface-variant/30 hover:bg-white/5 border border-transparent"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

function NotificationPreferences() {
  const { t } = useTranslation("notifications");
  const { accessToken, tenantId, notificationSound, toggleNotificationSound } = useAppStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const EVENT_GROUPS = [
    {
      key: "tickets",
      label: t("preferences.groups.tickets"),
      events: [
        { key: "ticket.assigned", label: t("preferences.events.ticket.assigned") },
        { key: "ticket.status_changed", label: t("preferences.events.ticket.status_changed") },
        { key: "ticket.reply_received", label: t("preferences.events.ticket.reply_received") },
        { key: "ticket.mention", label: t("preferences.events.ticket.mention") },
      ],
    },
    {
      key: "tasks",
      label: t("preferences.groups.tasks"),
      events: [
        { key: "task.assigned", label: t("preferences.events.task.assigned") },
        { key: "task.due_soon", label: t("preferences.events.task.due_soon") },
        { key: "task.completed", label: t("preferences.events.task.completed") },
      ],
    },
    {
      key: "sla",
      label: t("preferences.groups.sla"),
      events: [
        { key: "sla.breach_warning", label: t("preferences.events.sla.breach_warning") },
        { key: "sla.breached", label: t("preferences.events.sla.breached") },
      ],
    },
    {
      key: "system",
      label: t("preferences.groups.system"),
      events: [
        { key: "user.invited", label: t("preferences.events.user.invited") },
        { key: "mailbox.error", label: t("preferences.events.mailbox.error") },
      ],
    },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await api.notifications.preferences.$get();
      const body = await res.json() as any;
      if (!res.ok) return {};
      return body;
    },
  });

  const prefs: Record<string, Record<Channel, boolean>> = (data as any)?.data ?? {};

  const getPref = (eventKey: string, channel: Channel): boolean => {
    return prefs[eventKey]?.[channel] ?? true;
  };

  const mutation = useMutation({
    mutationFn: async ({
      eventKey,
      channel,
      enabled,
    }: {
      eventKey: string;
      channel: Channel;
      enabled: boolean;
    }) => {
      const res = await api.notifications.preferences.$put({
        json: { eventKey, channel, enabled } as any,
      });
      if (!res.ok) throw new Error("Failed to save preference");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      success(t("preferences.saved"));
    },
    onError: (err: any) => toastError(err.message),
  });

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">{t("preferences.title")}</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          {t("preferences.description")}
        </p>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-on-surface">{t("preferences.soundTitle")}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{t("preferences.soundDescription")}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={notificationSound}
            onChange={() => toggleNotificationSound()}
          />
          <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-container rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {EVENT_GROUPS.map((group) => (
            <div key={group.key} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant bg-surface-container-low">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-on-surface">{group.label}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                    <span className="w-7 text-center">{t("preferences.channelApp")}</span>
                    <span className="w-7 text-center">{t("preferences.channelEmail")}</span>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-outline-variant">
                {group.events.map((event) => (
                  <div key={event.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-on-surface">{event.label}</span>
                    <div className="flex items-center gap-3">
                      <ChannelToggle
                        enabled={getPref(event.key, "IN_APP")}
                        onChange={(v) => mutation.mutate({ eventKey: event.key, channel: "IN_APP", enabled: v })}
                        icon={Bell}
                        label={t("preferences.inApp")}
                      />
                      <ChannelToggle
                        enabled={getPref(event.key, "EMAIL")}
                        onChange={(v) => mutation.mutate({ eventKey: event.key, channel: "EMAIL", enabled: v })}
                        icon={Mail}
                        label={t("preferences.email")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
