import { createFileRoute } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { useAppStore } from "@/store";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/_auth/notification-preferences")({
  component: NotificationPreferences,
});

const EVENT_GROUPS = [
  {
    label: "Tickets",
    events: [
      { key: "ticket.assigned", label: "Ticket assigned to me" },
      { key: "ticket.status_changed", label: "Ticket status changed" },
      { key: "ticket.reply_received", label: "Reply received on my ticket" },
      { key: "ticket.mention", label: "Mentioned in ticket" },
    ],
  },
  {
    label: "Tasks",
    events: [
      { key: "task.assigned", label: "Task assigned to me" },
      { key: "task.due_soon", label: "Task due soon (24h)" },
      { key: "task.completed", label: "Task completed" },
    ],
  },
  {
    label: "SLA",
    events: [
      { key: "sla.breach_warning", label: "SLA breach warning" },
      { key: "sla.breached", label: "SLA breached" },
    ],
  },
  {
    label: "System",
    events: [
      { key: "user.invited", label: "New user invited" },
      { key: "mailbox.error", label: "Mailbox connection error" },
    ],
  },
];

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
  const { accessToken, tenantId } = useAppStore();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const headers = {
    Authorization: `Bearer ${accessToken ?? ""}`,
    "X-Tenant-ID": tenantId ?? "",
    "Content-Type": "application/json",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await authFetch("/api/notifications/preferences", { headers });
      if (!res.ok) return {};
      return res.json();
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
      const res = await authFetch("/api/notifications/preferences", {
        method: "PUT",
        headers,
        body: JSON.stringify({ eventKey, channel, enabled }),
      });
      if (!res.ok) throw new Error("Failed to save preference");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      success("Preference saved");
    },
    onError: (err: any) => toastError(err.message),
  });

  return (
    <div className="max-w-xl flex flex-col gap-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">Notification Preferences</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Choose how you get notified for each event type.
        </p>
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
            <div key={group.label} className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-outline-variant bg-surface-container-low">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-on-surface">{group.label}</h3>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-on-surface-variant/40 uppercase tracking-wider">
                    <span className="w-7 text-center">App</span>
                    <span className="w-7 text-center">Email</span>
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
                        label="In-app notifications"
                      />
                      <ChannelToggle
                        enabled={getPref(event.key, "EMAIL")}
                        onChange={(v) => mutation.mutate({ eventKey: event.key, channel: "EMAIL", enabled: v })}
                        icon={Mail}
                        label="Email notifications"
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
