import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_auth/messages")({
  component: MessagesPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Participant = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  lastReadAt: string;
};

type ConvSummary = {
  id: string;
  type: string;
  name: string | null;
  participants: Participant[];
  lastMessage: { id: string; body: string; senderId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
};

type ChatMsg = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  senderFirstName: string;
  senderLastName: string;
  senderEmail: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500", "bg-orange-500",
];

function avatarColor(userId: string) {
  let hash = 0;
  for (const c of userId) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function otherParticipant(conv: ConvSummary, myUserId: string): Participant | null {
  return conv.participants.find((p) => p.userId !== myUserId) ?? conv.participants[0] ?? null;
}

function convDisplayName(conv: ConvSummary, myUserId: string): string {
  if (conv.name) return conv.name;
  const other = otherParticipant(conv, myUserId);
  if (!other) return "Unknown";
  return `${other.firstName} ${other.lastName}`;
}

// ─── ConvItem ─────────────────────────────────────────────────────────────────

function ConvItem({ conv, isSelected, onSelect, myUserId }: {
  conv: ConvSummary;
  isSelected: boolean;
  onSelect: () => void;
  myUserId: string;
}) {
  const other = otherParticipant(conv, myUserId);
  const name = convDisplayName(conv, myUserId);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors rounded-lg",
        isSelected ? "bg-primary/10" : "hover:bg-white/5",
      )}
    >
      <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white", other ? avatarColor(other.userId) : "bg-outline-variant")}>
        {other ? initials(other.firstName, other.lastName) : "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium text-on-surface truncate">{name}</span>
          {conv.lastMessage && (
            <span className="text-[10px] text-on-surface-variant/50 shrink-0">{fmtTime(conv.lastMessage.createdAt)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-on-surface-variant/60 truncate">
            {conv.lastMessage ? conv.lastMessage.body : "—"}
          </p>
          {conv.unreadCount > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── ConvList ─────────────────────────────────────────────────────────────────

function ConvList({ selectedId, onSelect, onNew, myUserId }: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  myUserId: string;
}) {
  const { t } = useTranslation("messages");
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.conversations.index.$get();
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data as ConvSummary[];
    },
    refetchInterval: 15_000,
  });

  return (
    <div className="w-72 shrink-0 border-r border-outline-variant flex flex-col">
      <div className="p-3 border-b border-outline-variant flex items-center justify-between">
        <span className="text-sm font-semibold text-on-surface">{t("title")}</span>
        <button
          onClick={onNew}
          className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
          title={t("newMessage")}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-on-surface-variant/40" />
            </div>
            <p className="text-xs text-on-surface-variant/50">{t("noConversations")}</p>
            <button
              onClick={onNew}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              {t("startFirst")}
            </button>
          </div>
        ) : (
          data.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isSelected={selectedId === conv.id}
              onSelect={() => onSelect(conv.id)}
              myUserId={myUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── MessageThread ────────────────────────────────────────────────────────────

function MessageThread({ conversationId, myUserId }: { conversationId: string; myUserId: string }) {
  const { t } = useTranslation("messages");
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch conversation info for the header
  const { data: convList } = useQuery<ConvSummary[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.conversations.index.$get();
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data as ConvSummary[];
    },
  });
  const conv = convList?.find((c) => c.id === conversationId);

  // Fetch messages
  const { data: msgData, isLoading } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const res = await (api.conversations as any)[":id"].messages.$get({
        param: { id: conversationId },
        query: { limit: "50" },
      });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data as { messages: ChatMsg[]; hasMore: boolean; nextCursor: string | null };
    },
    refetchInterval: 10_000,
  });

  // Mark as read when opened
  useEffect(() => {
    (api.conversations as any)[":id"].read.$put({ param: { id: conversationId } }).catch(() => {});
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [conversationId, qc]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgData?.messages.length]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const res = await (api.conversations as any)[":id"].messages.$post({
        param: { id: conversationId },
        json: { body: text },
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (body.trim()) send.mutate(body.trim());
    }
  };

  const other = conv ? otherParticipant(conv, myUserId) : null;
  const headerName = conv ? convDisplayName(conv, myUserId) : "…";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-3 shrink-0">
        {other && (
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", avatarColor(other.userId))}>
            {initials(other.firstName, other.lastName)}
          </div>
        )}
        <span className="text-sm font-semibold text-on-surface">{headerName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {msgData?.hasMore && (
              <div className="flex justify-center mb-3">
                <button
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                  onClick={() => setCursor(msgData.nextCursor ?? null)}
                >
                  {t("loadMore")}
                </button>
              </div>
            )}
            {msgData?.messages.map((msg, i) => {
              const isMe = msg.senderId === myUserId;
              const prevMsg = msgData.messages[i - 1];
              const showSender = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);
              return (
                <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  {showSender && (
                    <span className="text-[10px] text-on-surface-variant/50 ml-1 mb-0.5">
                      {msg.senderFirstName} {msg.senderLastName}
                    </span>
                  )}
                  <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2 text-sm break-words", isMe ? "bg-primary text-on-primary rounded-br-sm" : "bg-surface-container-high text-on-surface rounded-bl-sm")}>
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-on-surface-variant/40 mt-0.5 mx-1">{fmtTime(msg.createdAt)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-3 border-t border-outline-variant shrink-0">
        <div className="flex items-end gap-2 bg-surface-container rounded-xl px-3 py-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none max-h-32 leading-5"
            style={{ overflowY: body.includes("\n") ? "auto" : "hidden" }}
          />
          <button
            onClick={() => { if (body.trim()) send.mutate(body.trim()); }}
            disabled={!body.trim() || send.isPending}
            className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-on-surface-variant/30 mt-1 px-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}

// ─── NewChatModal ─────────────────────────────────────────────────────────────

function NewChatModal({ onClose, onCreated, myUserId }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  myUserId: string;
}) {
  const { t } = useTranslation("messages");
  const [search, setSearch] = useState("");

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", "list"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data as { id: string; firstName: string; lastName: string; email: string }[];
    },
  });

  const start = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.conversations.direct.$post({ json: { userId } });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data.conversationId as string;
    },
    onSuccess: onCreated,
  });

  const filtered = (usersData ?? [])
    .filter((u) => u.id !== myUserId)
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="text-sm font-semibold text-on-surface">{t("newMessage")}</span>
          <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 bg-surface-container-high rounded-lg px-3 py-2 mb-3">
            <Search className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchUsers")}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>

          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-on-surface-variant/50 text-center py-6">{t("noUsers")}</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => start.mutate(u.id)}
                  disabled={start.isPending}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0", avatarColor(u.id))}>
                    {initials(u.firstName, u.lastName)}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-[11px] text-on-surface-variant/50 truncate">{u.email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation("messages");
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-outline-variant flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-on-surface-variant/30" />
      </div>
      <div>
        <p className="text-sm font-medium text-on-surface">{t("selectConversation")}</p>
        <p className="text-xs text-on-surface-variant/50 mt-1">{t("startNew")}</p>
      </div>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {t("newMessage")}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MessagesPage() {
  const user = useAppStore((s) => s.user);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);

  if (!user) return null;

  const handleConvCreated = (id: string) => {
    setShowNewChat(false);
    setSelectedConvId(id);
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] border border-outline-variant rounded-xl overflow-hidden bg-surface">
      <ConvList
        selectedId={selectedConvId}
        onSelect={setSelectedConvId}
        onNew={() => setShowNewChat(true)}
        myUserId={user.id}
      />

      {selectedConvId ? (
        <MessageThread conversationId={selectedConvId} myUserId={user.id} />
      ) : (
        <EmptyState onNew={() => setShowNewChat(true)} />
      )}

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onCreated={handleConvCreated}
          myUserId={user.id}
        />
      )}
    </div>
  );
}
