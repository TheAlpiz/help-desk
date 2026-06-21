import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import {
  Clock,
  UserCheck,
  Tag,
  Paperclip,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
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
  "ticket.created": <MessageSquare className="w-3 h-3 text-primary" />,
  "ticket.assigned": <UserCheck className="w-3 h-3 text-violet-400" />,
  "ticket.status_changed": <ArrowRight className="w-3 h-3 text-amber-400" />,
  "ticket.priority_changed": <ShieldCheck className="w-3 h-3 text-orange-400" />,
  "ticket.tag_added": <Tag className="w-3 h-3 text-emerald-400" />,
  "ticket.tag_removed": <Tag className="w-3 h-3 text-red-400" />,
  "ticket.message_added": <MessageSquare className="w-3 h-3 text-blue-400" />,
  "ticket.attachment_added": <Paperclip className="w-3 h-3 text-on-surface-variant" />,
  "ticket.merged": <ArrowRight className="w-3 h-3 text-red-400" />,
};

const ACTION_LABELS: Record<string, (e: TimelineEntry) => string> = {
  "ticket.created": () => "Ticket created",
  "ticket.assigned": (e) => `Assigned to ${e.after?.assigneeName ?? "agent"}`,
  "ticket.status_changed": (e) => `Status → ${e.after?.status ?? ""}`,
  "ticket.priority_changed": (e) => `Priority → ${e.after?.priority ?? ""}`,
  "ticket.tag_added": (e) => `Tag added: ${e.after?.tag ?? ""}`,
  "ticket.tag_removed": (e) => `Tag removed: ${e.before?.tag ?? ""}`,
  "ticket.message_added": (e) =>
    e.after?.type === "INTERNAL_NOTE" ? "Internal note added" : "Reply sent",
  "ticket.attachment_added": () => "Attachment uploaded",
  "ticket.merged": (e) => `Merged into ${e.after?.targetTicketId ?? "ticket"}`,
};

export function TicketTimeline({ ticketId }: { ticketId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ticket-audit", ticketId],
    queryFn: async () => {
      const state = useAppStore.getState();
      const headers: Record<string, string> = {};
      if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
      if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
      const res = await fetch(`/api/auditLogs/ticket/${ticketId}`, { headers });
      if (!res.ok) return { data: [] };
      return res.json();
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
              const label = ACTION_LABELS[entry.action]?.(entry) ?? entry.action;
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
