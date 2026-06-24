import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, Download, FileText, X, Loader2, Trash2 } from "lucide-react";
import { useAppStore } from "@/store";

interface Props {
  /** Entity this attachment list is scoped to. Defaults to TICKET for back-compat. */
  entityType?: "TICKET" | "TASK" | "TICKET_MESSAGE" | "EMAIL";
  entityId?: string;
  /** @deprecated pass entityId instead */
  ticketId?: string;
}

type UploadState = { name: string; progress: "uploading" | "confirming" | "done" | "error"; error?: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketAttachments({ entityType = "TICKET", entityId, ticketId }: Props) {
  const { t } = useTranslation("common");
  const eid = (entityId ?? ticketId) as string;
  const queryClient = useQueryClient();
  const { accessToken, tenantId } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["attachments", entityType, eid],
    queryFn: async () => {
      const res = await api.attachments.index.$get({ query: { entityType, entityId: eid } as any });
      const body = await res.json() as any;
      if (!res.ok) throw new Error("Failed to fetch attachments");
      return body;
    },
  });

  const attachments: any[] = (data as any)?.data ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const entry: UploadState = { name: file.name, progress: "uploading" };
      setUploads((prev) => [...prev, entry]);

      const idx = uploads.length; // capture for update

      try {
        // Step 1: request presigned URL
        const reqRes = await api.attachments["upload-request"].$post({
          json: {
            entityType: entityType as any,
            entityId: eid,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
        });

        const err = await reqRes.json() as any;
        if (!reqRes.ok) {
          throw new Error(err?.error?.message || "Upload request failed");
        }

        const uploadData = err.data;
        const { uploadUrl, storageKey, filename, mimeType, sizeBytes } = uploadData;

        // Step 2: PUT to presigned URL (direct to MinIO)
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!putRes.ok) throw new Error("Upload to storage failed");

        setUploads((prev) =>
          prev.map((u) => (u.name === file.name ? { ...u, progress: "confirming" } : u)),
        );

        // Step 3: confirm
        const confirmRes = await api.attachments.confirm.$post({
          json: {
            storageKey,
            entityType: entityType as any,
            entityId: eid,
            filename,
            mimeType,
            sizeBytes,
          },
        });

        if (!confirmRes.ok) throw new Error("Confirm upload failed");

        setUploads((prev) =>
          prev.map((u) => (u.name === file.name ? { ...u, progress: "done" } : u)),
        );
        queryClient.invalidateQueries({ queryKey: ["attachments", entityType, eid] });

        // Remove done entry after 2s
        setTimeout(() => {
          setUploads((prev) => prev.filter((u) => !(u.name === file.name && u.progress === "done")));
        }, 2000);
      } catch (err: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.name === file.name ? { ...u, progress: "error", error: err.message } : u,
          ),
        );
      }
    }
  };

  const handleDownload = async (id: string) => {
    // Fetch the presigned URL *with* the Bearer token (authFetch injects it),
    // then open the presigned URL directly — its signature is in the query, so
    // it needs no auth header and triggers no CORS.
    const res = await api.attachments[":id"].download.$get({ param: { id } });
    if (!res.ok) return;
    const json = (await res.json()) as any;
    const url = json?.data?.url;
    if (url) window.open(url, "_blank");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("attachments.confirmDelete", "Delete this attachment?"))) return;
    const res = await api.attachments[":id"].$delete({ param: { id } });
    if (!res.ok) return;
    queryClient.invalidateQueries({ queryKey: ["attachments", entityType, eid] });
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          {t("attachments.title")}
        </h3>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
        >
          <Upload className="w-3 h-3" />
          {t("attachments.upload")}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        onClick={(e) => { (e.target as HTMLInputElement).value = ""; }}
      />

      {/* In-progress uploads */}
      {uploads.length > 0 && (
        <div className="space-y-1.5">
          {uploads.map((u, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-white/3 rounded-lg">
              {u.progress === "error" ? (
                <X className="w-3.5 h-3.5 text-error shrink-0" />
              ) : u.progress === "done" ? (
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
              )}
              <span className="text-[11px] text-on-surface truncate flex-1">{u.name}</span>
              <span className="text-[10px] text-on-surface-variant/50 shrink-0">
                {u.progress === "error" ? t("attachments.progressFailed") : u.progress === "done" ? t("attachments.progressDone") : u.progress}
              </span>
              {(u.progress === "done" || u.progress === "error") && (
                <button
                  onClick={() => setUploads((prev) => prev.filter((_, j) => j !== i))}
                  className="text-on-surface-variant/30 hover:text-on-surface-variant transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Existing attachments */}
      {isLoading ? (
        <div className="space-y-1.5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-8 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ) : attachments.length === 0 && uploads.length === 0 ? (
        <p className="text-[11px] text-on-surface-variant/40 text-center py-2">
          {t("attachments.noAttachments")}
        </p>
      ) : (
        <div className="space-y-1">
          {attachments.map((att: any) => (
            <div
              key={att.id}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
            >
              <button
                onClick={() => handleDownload(att.id)}
                className="flex-1 min-w-0 flex items-center gap-2 text-left"
              >
                <FileText className="w-3.5 h-3.5 text-on-surface-variant/50 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="text-[11px] text-on-surface truncate block">{att.filename}</span>
                  <span className="text-[10px] text-on-surface-variant/40">
                    {formatBytes(att.sizeBytes)}
                  </span>
                </span>
                <Download className="w-3 h-3 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
              </button>
              <button
                onClick={() => handleDelete(att.id)}
                title={t("attachments.delete", "Delete")}
                className="p-1 rounded text-on-surface-variant/30 hover:text-error transition-colors shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone hint */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border border-dashed border-outline-variant/50 rounded-lg p-3 text-center text-[10px] text-on-surface-variant/30 hover:border-primary/40 hover:text-primary/50 transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        {t("attachments.dropHint")}
      </div>
    </div>
  );
}

/** Entity-agnostic alias — same component, clearer name for non-ticket entities. */
export const EntityAttachments = TicketAttachments;
