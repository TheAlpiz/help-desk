import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import {
  Clock,
  UserCheck,
  Tag,
  Paperclip,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

type TimelineEntry = {
  id: string;
  action: string;
  actor?: string;
  before?: any;
  after?: any;
  createdAt: string;
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <MessageSquare className="w-3 h-3 text-primary" />,
  assigned: <UserCheck className="w-3 h-3 text-violet-400" />,
  status_changed: <ArrowRight className="w-3 h-3 text-amber-400" />,
  priority_changed: <ShieldCheck className="w-3 h-3 text-orange-400" />,
  tag_added: <Tag className="w-3 h-3 text-emerald-400" />,
  tag_removed: <Tag className="w-3 h-3 text-red-400" />,
  message_added: <MessageSquare className="w-3 h-3 text-blue-400" />,
  attachment_added: <Paperclip className="w-3 h-3 text-on-surface-variant" />,
  merged: <ArrowRight className="w-3 h-3 text-red-400" />,
  automation_fired: <Zap className="w-3 h-3 text-primary" />,
};

export function TicketTimeline({ ticketId }: { ticketId: string }) {
  const { t } = useTranslation("tickets");
  const { data, isLoading } = useQuery({
    queryKey: ["ticket-audit", ticketId],
    queryFn: async () => {
      const res = await api.auditLogs[":entityType"][":entityId"].$get({ param: { entityType: "ticket", entityId: ticketId } });
      const body = await res.json() as any;
      if (!res.ok) return { data: [] };
      return body;
    },
  });

  const entries: TimelineEntry[] = (data as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
        <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-2">
            <div className="w-5 h-5 rounded-full bg-white/5 animate-pulse shrink-0" />
            <div className="flex-1 h-3 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-on-surface-variant" />
        Activity
      </h3>
      {entries.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant/40 text-center py-3">No activity yet</p>
      ) : (
        <div className="relative">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-outline-variant" />
          <div className="space-y-3">
            {entries.map((entry) => {
              const icon = ACTION_ICONS[entry.action] ?? (
                <Clock className="w-3 h-3 text-on-surface-variant/40" />
              );
              let label = entry.action;
              if (entry.action === "created") label = t("timeline.created");
              else if (entry.action === "status_changed") label = t(`timeline.status_changed`, { status: t(`statuses.${entry.after?.status ?? ""}`) || entry.after?.status });
              else if (entry.action === "assigned") label = t("timeline.assigned", { name: entry.after?.assigneeName ?? "agent" });
              else if (entry.action === "priority_changed") label = t("timeline.priority_changed", { priority: t(`priorities.${entry.after?.priority ?? ""}`) || entry.after?.priority });
              else if (entry.action === "tag_added") label = t("timeline.tag_added", { tag: entry.after?.tag ?? "" });
              else if (entry.action === "tag_removed") label = t("timeline.tag_removed", { tag: entry.before?.tag ?? "" });
              else if (entry.action === "message_added") label = entry.after?.type === "INTERNAL_NOTE" ? t("timeline.message_added_note") : t("timeline.message_added_reply");
              else if (entry.action === "attachment_added") label = t("timeline.attachment_added");
              else if (entry.action === "merged") label = t("timeline.merged", { target: entry.after?.targetTicketId ?? "ticket" });
              else if (entry.action === "automation_fired") label = t("timeline.automation_fired");
              return (
                <div key={entry.id} className="flex gap-2.5 items-start relative">
                  <div className="w-5 h-5 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 z-10">
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[11px] text-on-surface leading-snug">{label}</p>
                    {entry.actor && (
                      <p className="text-[10px] text-on-surface-variant/50 mt-0.5">
                        by {entry.actor}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-on-surface-variant/30 mt-0.5">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
