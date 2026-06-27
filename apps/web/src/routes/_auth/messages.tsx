import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Plus, Send, Loader2, Search, X, Paperclip, Users, FileText, CheckSquare, Square, Download } from "lucide-react";
import { isImage, ImageThumb, Lightbox, type LightboxItem } from "@/features/tickets/TicketAttachments";
import { api } from "@/lib/api";
import { authFetch } from "@/lib/authFetch";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { presenceDot, availabilityMeta } from "@/lib/presence";
import { useToast } from "@/components/Toast";

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
  adminId: string | null;
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

type StagedResult = { storageKey: string; filename: string; mimeType: string; sizeBytes: number };

// A file chosen in the composer. Uploaded to storage immediately (status →
// "ready"); linked to the message only once the message is sent.
type StagedFile = {
  id: string;
  name: string;
  status: "uploading" | "ready" | "error";
  result?: StagedResult;
  error?: string;
};

// Stage a file to storage right away (server streams it to MinIO).
async function stageFile(file: File): Promise<StagedResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await authFetch("/api/attachments/stage", { method: "POST", body: fd });
  const body = (await res.json().catch(() => null)) as any;
  if (!res.ok) throw new Error(body?.error?.message || body?.message || "Upload failed");
  return body.data as StagedResult;
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

      <div className="flex-1 overflow-y-auto pretty-scroll p-2 space-y-0.5">
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
  const { error: toastError } = useToast();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [body, setBody] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [files, setFiles] = useState<StagedFile[]>([]);
  const [lightbox, setLightbox] = useState<LightboxItem | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Stage selected files immediately so they're uploaded (with a loader) before
  // the message is sent.
  const onFilesSelected = (picked: File[]) => {
    for (const file of picked) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setFiles((prev) => [...prev, { id, name: file.name, status: "uploading" }]);
      stageFile(file)
        .then((result) =>
          setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "ready", result } : f))),
        )
        .catch((err) =>
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "error", error: err?.message } : f)),
          ),
        );
    }
  };

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

  // Jump straight to the bottom when switching conversations (no animation).
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversationId]);

  // Auto-scroll to the latest message. Smooth when already near the bottom so we
  // don't yank the user away while they're reading older messages. Scrolls the
  // container itself (not the page) so the rest of the layout stays put.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    el.scrollTo({ top: el.scrollHeight, behavior: nearBottom ? "smooth" : "auto" });
  }, [msgData?.messages.length]);

  const send = useMutation({
    mutationFn: async ({ text, attach }: { text: string; attach: StagedResult[] }) => {
      const res = await (api.conversations as any)[":id"].messages.$post({
        param: { id: conversationId },
        // Announce the count up front so recipients render skeletons immediately.
        json: { body: text, attachmentCount: attach.length },
      });
      if (!res.ok) throw new Error("Failed");
      const msg = ((await res.json()) as any).data as ChatMsg;
      // Files are already in storage — just link each to the new message.
      for (const a of attach) {
        await api.attachments.confirm.$post({
          json: {
            storageKey: a.storageKey,
            entityType: "CHAT_MESSAGE",
            entityId: msg.id,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          },
        });
      }
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
      if (textareaRef.current) textareaRef.current.style.height = "auto";
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => {
      toastError(err?.message || t("errorUpload"));
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const readyFiles = files.filter((f) => f.status === "ready");
  const uploading = files.some((f) => f.status === "uploading");
  // Sendable once there's content or a ready file, nothing still uploading.
  const canSend =
    (body.trim().length > 0 || readyFiles.length > 0) && !uploading && !send.isPending;
  const submit = () => {
    if (!canSend) return;
    send.mutate({
      text: body.trim(),
      attach: readyFiles.map((f) => f.result!).filter(Boolean),
    });
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
      <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
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
        {conv?.type === "group" && (
          <button
            onClick={() => setShowGroupDetails(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-white/5 hover:text-on-surface transition-colors"
            title="Group details"
          >
            <div className="w-4 h-4 border-2 border-current rounded-full flex items-center justify-center text-[10px] font-bold">i</div>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto pretty-scroll px-4 py-4 space-y-1">
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
                    {(() => {
                      const imageAttachments = msg.attachments?.filter(a => isImage(a.mimeType)) || [];
                      const fileAttachments = msg.attachments?.filter(a => !isImage(a.mimeType)) || [];
                      return (
                        <div className="space-y-2 w-full mt-1">
                          {imageAttachments.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {imageAttachments.map((a) => (
                                <ImageThumb
                                  key={a.id}
                                  att={a}
                                  onOpen={setLightbox}
                                />
                              ))}
                            </div>
                          )}
                          {fileAttachments.length > 0 && (
                            <div className="space-y-1">
                              {fileAttachments.map((a) => (
                                <div
                                  key={a.id}
                                  className="w-full flex items-center gap-2 p-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-white/5 transition-colors text-left group"
                                >
                                  <button
                                    onClick={() => openAttachment(a.id)}
                                    className="flex-1 min-w-0 flex items-center gap-2 text-left"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
                                    <span className="flex-1 min-w-0">
                                      <span className="block text-xs text-on-surface truncate">{a.filename}</span>
                                      <span className="block text-[10px] text-on-surface-variant/40">{fmtBytes(a.sizeBytes)}</span>
                                    </span>
                                    <Download className="w-3 h-3 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
          </>
        )}
      </div>

      {/* Composer */}
      <div className="px-3 py-3 border-t border-outline-variant shrink-0">
        {/* Selected files preview — uploads start on select, with a loader. */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((f) => (
              <span
                key={f.id}
                className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 border rounded-lg text-[11px] ${
                  f.status === "error"
                    ? "bg-error/10 border-error/30 text-error"
                    : "bg-surface-container-high border-outline-variant text-on-surface"
                }`}
              >
                {f.status === "uploading" ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : f.status === "error" ? (
                  <X className="w-3 h-3 text-error" />
                ) : (
                  <Paperclip className="w-3 h-3 text-on-surface-variant/50" />
                )}
                <span className="max-w-[140px] truncate" title={f.error || f.name}>{f.name}</span>
                <button
                  onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  className="text-on-surface-variant/40 hover:text-error transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 bg-surface-container rounded-xl px-3 py-1.5">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) onFilesSelected(Array.from(e.target.files));
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
            onChange={(e) => {
              setBody(e.target.value);
              // Auto-grow up to max-h so multi-line messages stay fully visible.
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none max-h-32 leading-5 py-1 block self-center pretty-scroll"
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-on-surface-variant/30 mt-1 px-1">{t("sendHint")}</p>
      </div>
      {lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
      {showGroupDetails && conv && (
        <GroupDetailsModal
          conv={conv}
          myUserId={myUserId}
          onClose={() => setShowGroupDetails(false)}
        />
      )}
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

          <div className="space-y-0.5 max-h-56 overflow-y-auto pretty-scroll">
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

// ─── GroupDetailsModal ────────────────────────────────────────────────────────

function GroupDetailsModal({ conv, myUserId, onClose }: {
  conv: ConvSummary;
  myUserId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation("messages");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const isAdmin = conv.adminId === myUserId;

  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.users.index.$get();
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      return (json as any).data as { id: string; firstName: string; lastName: string; email: string }[];
    },
    enabled: isAdmin,
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await (api.conversations as any)[":id"].participants.$post({
        param: { id: conv.id },
        json: { userId }
      });
      if (!res.ok) throw new Error("Failed to add member");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] })
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const res = await (api.conversations as any)[":id"].participants[":userId"].$delete({
        param: { id: conv.id, userId }
      });
      if (!res.ok) throw new Error("Failed to remove member");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] })
  });

  const leaveGroup = useMutation({
    mutationFn: async () => {
      const res = await (api.conversations as any)[":id"].leave.$delete({
        param: { id: conv.id }
      });
      if (!res.ok) throw new Error("Failed to leave group");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      onClose();
    }
  });

  // Filter users not already in the group
  const existingIds = new Set(conv.participants.map((p) => p.userId));
  const availableUsers = (usersData ?? []).filter((u) => !existingIds.has(u.id));
  const filteredUsers = search.trim()
    ? availableUsers.filter((u) => {
        const q = search.toLowerCase();
        return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      })
    : availableUsers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden border border-outline-variant/30">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant shrink-0">
          <h3 className="font-semibold text-on-surface">{conv.name || t("groupDetails", "Group Details")}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-on-surface-variant transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pretty-scroll p-4 space-y-6">
          <div>
            <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-3">
              {t("members", "Members")} ({conv.participants.length})
            </h4>
            <div className="space-y-2">
              {conv.participants.map((p) => (
                <div key={p.userId} className="flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0", avatarColor(p.userId))}>
                      {initials(p.firstName, p.lastName)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-on-surface truncate">
                        {p.firstName} {p.lastName} {p.userId === conv.adminId ? t("adminRole", " (Admin)") : ""}
                      </span>
                      <span className="text-[11px] text-on-surface-variant/50 truncate">{p.email}</span>
                    </div>
                  </div>
                  {isAdmin && p.userId !== myUserId && (
                    <button
                      onClick={() => removeMember.mutate(p.userId)}
                      disabled={removeMember.isPending}
                      className="text-[10px] font-medium text-error opacity-0 group-hover:opacity-100 transition-opacity hover:underline disabled:opacity-40"
                    >
                      {t("remove", "Remove")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="pt-4 border-t border-outline-variant">
              <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-3">
                {t("addMembers", "Add Members")}
              </h4>
              <div className="flex items-center gap-2 bg-surface-container-high rounded-lg px-3 py-2 mb-3">
                <Search className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchUsers", "Search users...")}
                  className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none"
                />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pretty-scroll">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-on-surface-variant/50 text-center py-2">{t("noUsers", "No matching users")}</p>
                ) : (
                  filteredUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", avatarColor(u.id))}>
                          {initials(u.firstName, u.lastName)}
                        </div>
                        <span className="text-sm font-medium text-on-surface truncate">{u.firstName} {u.lastName}</span>
                      </div>
                      <button
                        onClick={() => addMember.mutate(u.id)}
                        disabled={addMember.isPending}
                        className="text-[10px] font-medium text-primary hover:underline disabled:opacity-40"
                      >
                        {t("add", "Add")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-outline-variant">
            <button
              onClick={() => leaveGroup.mutate()}
              disabled={leaveGroup.isPending}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-40"
            >
              {leaveGroup.isPending ? t("leaving", "Leaving...") : t("leaveGroup", "Leave Group")}
            </button>
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
