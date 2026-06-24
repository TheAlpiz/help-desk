import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Loader2, Search, X, Paperclip, Users, FileText, CheckSquare, Square } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { presenceDot, availabilityMeta } from "@/lib/presence";

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

type MsgAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
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
  attachmentCount?: number;
  attachments?: MsgAttachment[];
};

// Placeholder shown while an announced attachment is still uploading/confirming.
function AttachmentSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container w-full animate-pulse">
      <div className="w-4 h-4 rounded bg-white/10 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-2.5 bg-white/10 rounded w-2/3" />
        <div className="h-2 bg-white/5 rounded w-1/4" />
      </div>
    </div>
  );
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// Fetch a presigned URL (with auth) then open it — same flow as ticket attachments.
async function openAttachment(id: string) {
  const res = await api.attachments[":id"].download.$get({ param: { id } });
  if (!res.ok) return;
  const url = ((await res.json()) as any)?.data?.url;
  if (url) window.open(url, "_blank");
}

// Upload one file to MinIO (presign → PUT) and link it to a chat message.
async function uploadToMessage(file: File, messageId: string) {
  const reqRes = await api.attachments["upload-request"].$post({
    json: {
      entityType: "CHAT_MESSAGE",
      entityId: messageId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });
  const reqJson = (await reqRes.json()) as any;
  if (!reqRes.ok) throw new Error(reqJson?.error?.message ?? "Upload request failed");
  const { uploadUrl, storageKey, filename, mimeType, sizeBytes } = reqJson.data;

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error("Upload to storage failed");

  await api.attachments.confirm.$post({
    json: { storageKey, entityType: "CHAT_MESSAGE", entityId: messageId, filename, mimeType, sizeBytes },
  });
}

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

// Small presence indicator overlaid on an avatar. Reads live presence from the store.
function PresenceDot({ userId }: { userId?: string | null }) {
  const entry = useAppStore((s) => (userId ? s.presence[userId] : undefined));
  if (!userId) return null;
  const online = !!entry?.online;
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface-container",
        presenceDot(online, entry?.availability),
      )}
      title={online ? availabilityMeta(entry?.availability).fallback : "Offline"}
    />
  );
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
      {conv.type === "group" ? (
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
      ) : (
        <div className="relative shrink-0">
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white", other ? avatarColor(other.userId) : "bg-outline-variant")}>
            {other ? initials(other.firstName, other.lastName) : "?"}
          </div>
          <PresenceDot userId={other?.userId} />
        </div>
      )}
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

// Live "Active Duty" / "Offline" subtitle in a chat header.
function ThreadPresenceLabel({ userId }: { userId?: string | null }) {
  const entry = useAppStore((s) => (userId ? s.presence[userId] : undefined));
  if (!userId) return null;
  const online = !!entry?.online;
  const meta = availabilityMeta(entry?.availability);
  return (
    <span className={cn("text-[10px] truncate", online ? meta.text : "text-on-surface-variant/40")}>
      {online ? meta.fallback : "Offline"}
    </span>
  );
}

// ─── MessageThread ────────────────────────────────────────────────────────────

function MessageThread({ conversationId, myUserId }: { conversationId: string; myUserId: string }) {
  const { t } = useTranslation("messages");
  const qc = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async ({ text, attach }: { text: string; attach: File[] }) => {
      const res = await (api.conversations as any)[":id"].messages.$post({
        param: { id: conversationId },
        // Announce the count up front so recipients render skeletons immediately.
        json: { body: text, attachmentCount: attach.length },
      });
      if (!res.ok) throw new Error("Failed");
      const msg = ((await res.json()) as any).data as ChatMsg;
      // Link any selected files to the just-created message.
      for (const f of attach) await uploadToMessage(f, msg.id);
      // Re-announce so recipients refetch and swap skeletons for the real files.
      if (attach.length > 0) {
        await (api.conversations as any)[":id"].messages[":messageId"]["attachments-ready"]
          .$post({ param: { id: conversationId, messageId: msg.id } })
          .catch(() => {});
      }
    },
    onSuccess: () => {
      setBody("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const canSend = (body.trim().length > 0 || files.length > 0) && !send.isPending;
  const submit = () => {
    if (!canSend) return;
    send.mutate({ text: body.trim(), attach: files });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const other = conv ? otherParticipant(conv, myUserId) : null;
  const headerName = conv ? convDisplayName(conv, myUserId) : "…";

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant flex items-center gap-3 shrink-0">
        {conv?.type === "group" ? (
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
        ) : other ? (
          <div className="relative shrink-0">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", avatarColor(other.userId))}>
              {initials(other.firstName, other.lastName)}
            </div>
            <PresenceDot userId={other.userId} />
          </div>
        ) : null}
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-on-surface truncate">{headerName}</span>
          {conv?.type === "group" ? (
            <span className="text-[10px] text-on-surface-variant/50 truncate">
              {conv.participants.length} {t("members", "members")}
            </span>
          ) : (
            <ThreadPresenceLabel userId={other?.userId} />
          )}
        </div>
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
                  <div className={cn("max-w-[70%] flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
                    {msg.body && (
                      <div className={cn("rounded-2xl px-3.5 py-2 text-sm break-words", isMe ? "bg-primary text-on-primary rounded-br-sm" : "bg-surface-container-high text-on-surface rounded-bl-sm")}>
                        {msg.body}
                      </div>
                    )}
                    {msg.attachments?.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => openAttachment(a.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container hover:border-primary/40 transition-colors text-left w-full"
                        title={a.filename}
                      >
                        <FileText className="w-4 h-4 text-on-surface-variant/60 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-on-surface truncate">{a.filename}</span>
                          <span className="block text-[10px] text-on-surface-variant/40">{fmtBytes(a.sizeBytes)}</span>
                        </span>
                      </button>
                    ))}
                    {/* Skeletons for announced-but-not-yet-confirmed attachments */}
                    {Array.from({
                      length: Math.max(0, (msg.attachmentCount ?? 0) - (msg.attachments?.length ?? 0)),
                    }).map((_, k) => (
                      <AttachmentSkeleton key={`sk-${msg.id}-${k}`} />
                    ))}
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
        {/* Selected files preview */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-surface-container-high border border-outline-variant rounded-lg text-[11px] text-on-surface">
                <Paperclip className="w-3 h-3 text-on-surface-variant/50" />
                <span className="max-w-[140px] truncate">{f.name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="text-on-surface-variant/40 hover:text-error transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 bg-surface-container rounded-xl px-3 py-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={send.isPending}
            title={t("attach", "Attach files")}
            className="w-8 h-8 rounded-lg text-on-surface-variant/60 hover:text-primary hover:bg-white/5 flex items-center justify-center shrink-0 transition-colors disabled:opacity-40"
          >
            <Paperclip className="w-4 h-4" />
          </button>
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
            onClick={submit}
            disabled={!canSend}
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

function NewChatModal({ onClose, onCreated, myUserId, canCreateGroup }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  myUserId: string;
  canCreateGroup: boolean;
}) {
  const { t } = useTranslation("messages");
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  const createGroup = useMutation({
    mutationFn: async () => {
      const res = await api.conversations.group.$post({
        json: { name: groupName.trim(), participantIds: [...selected] },
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error?.message ?? "Failed to create group");
      }
      const json = await res.json();
      return (json as any).data.conversationId as string;
    },
    onSuccess: onCreated,
  });

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
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

  const groupValid = groupName.trim().length > 0 && selected.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-surface-container border border-outline-variant rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="text-sm font-semibold text-on-surface">
            {mode === "group" ? t("newGroup", "New group") : t("newMessage")}
          </span>
          <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs (group restricted to admins/supervisors) */}
        {canCreateGroup && (
          <div className="flex gap-1 px-3 pt-3">
            {(["direct", "group"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  mode === m ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-white/5",
                )}
              >
                {m === "group" ? <Users className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {m === "group" ? t("group", "Group") : t("direct", "Direct")}
              </button>
            ))}
          </div>
        )}

        <div className="p-3">
          {mode === "group" && (
            <input
              autoFocus
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("groupName", "Group name")}
              className="w-full mb-2 px-3 py-2 bg-surface-container-high rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}

          <div className="flex items-center gap-2 bg-surface-container-high rounded-lg px-3 py-2 mb-3">
            <Search className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
            <input
              autoFocus={mode === "direct"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchUsers")}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none"
            />
          </div>

          <div className="space-y-0.5 max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-on-surface-variant/50 text-center py-6">{t("noUsers")}</p>
            ) : (
              filtered.map((u) => {
                const isSel = selected.has(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => (mode === "group" ? toggle(u.id) : start.mutate(u.id))}
                    disabled={start.isPending}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors disabled:opacity-50",
                      mode === "group" && isSel ? "bg-primary/5" : "hover:bg-white/5",
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0", avatarColor(u.id))}>
                      {initials(u.firstName, u.lastName)}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-sm font-medium text-on-surface truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-[11px] text-on-surface-variant/50 truncate">{u.email}</p>
                    </div>
                    {mode === "group" &&
                      (isSel ? <CheckSquare className="w-4 h-4 text-primary shrink-0" /> : <Square className="w-4 h-4 text-on-surface-variant/30 shrink-0" />)}
                  </button>
                );
              })
            )}
          </div>

          {mode === "group" && (
            <button
              onClick={() => createGroup.mutate()}
              disabled={!groupValid || createGroup.isPending}
              className="w-full mt-3 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              {createGroup.isPending
                ? t("creating", "Creating…")
                : `${t("createGroup", "Create group")}${selected.size ? ` (${selected.size})` : ""}`}
            </button>
          )}
          {createGroup.error && (
            <p className="text-xs text-error mt-2">{(createGroup.error as Error).message}</p>
          )}
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

  const canCreateGroup = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(user.globalRole);

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
          canCreateGroup={canCreateGroup}
        />
      )}
    </div>
  );
}
