import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StickyNote, Plus, Trash2, Bell, BellOff, Pencil, X, Lock, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth/notes")({
  component: NotesPage,
});

type Note = {
  id: string;
  title: string | null;
  content: string;
  reminderAt: string | null;
  reminderFired: boolean;
  updatedAt: string;
};

// datetime-local <-> ISO helpers. The <input> works in local time; the API wants
// an ISO string with offset.
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function NotesPage() {
  const { t } = useTranslation("common");
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Note | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await api.notes.index.$get();
      if (!res.ok) throw new Error("Failed to load notes");
      return ((await res.json()) as any).data as Note[];
    },
  });
  const notes = data ?? [];

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.notes[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-semibold text-on-surface">{t("notes.title", "My Notes")}</h1>
          <span className="inline-flex items-center gap-1 text-[10px] text-on-surface-variant/50 border border-outline-variant rounded-full px-2 py-0.5">
            <Lock className="w-3 h-3" /> {t("notes.private", "Private")}
          </span>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("notes.new", "New note")}
        </button>
      </div>

      {editing && (
        <NoteEditor
          note={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
            <StickyNote className="w-6 h-6 text-on-surface-variant/40" />
          </div>
          <p className="text-sm text-on-surface-variant/50">{t("notes.empty", "No notes yet")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              onEdit={() => setEditing(n)}
              onDelete={() => removeMutation.mutate(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit, onDelete }: { note: Note; onEdit: () => void; onDelete: () => void }) {
  const { t } = useTranslation("common");
  const reminderActive = !!note.reminderAt && !note.reminderFired && new Date(note.reminderAt) > new Date();
  return (
    <div className="group bg-surface-container border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-on-surface truncate">
          {note.title || t("notes.untitled", "Untitled")}
        </h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} title={t("notes.edit", "Edit")} className="p-1 rounded text-on-surface-variant/50 hover:text-primary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} title={t("notes.delete", "Delete")} className="p-1 rounded text-on-surface-variant/50 hover:text-error transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {note.content && (
        <p className="text-xs text-on-surface-variant/70 whitespace-pre-wrap line-clamp-5 leading-relaxed">
          {note.content}
        </p>
      )}
      {note.reminderAt && (
        <div className={`mt-auto inline-flex items-center gap-1.5 text-[10px] font-medium ${reminderActive ? "text-primary" : "text-on-surface-variant/40"}`}>
          {reminderActive ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
          {note.reminderFired
            ? t("notes.reminded", "Reminded")
            : `${t("notes.reminder", "Reminder")}: ${new Date(note.reminderAt).toLocaleString()}`}
        </div>
      )}
    </div>
  );
}

function NoteEditor({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const { t } = useTranslation("common");
  const qc = useQueryClient();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [reminderOn, setReminderOn] = useState(!!note?.reminderAt);
  const [reminderLocal, setReminderLocal] = useState(isoToLocalInput(note?.reminderAt ?? null));

  const save = useMutation({
    mutationFn: async () => {
      const reminderAt = reminderOn ? localInputToIso(reminderLocal) : null;
      const body = { title: title || null, content, reminderAt } as any;
      const res = note
        ? await api.notes[":id"].$put({ param: { id: note.id }, json: body })
        : await api.notes.index.$post({ json: body });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as any;
        throw new Error(j?.error?.message ?? "Failed to save note");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      onClose();
    },
  });

  return (
    <div className="bg-surface-container-high border border-outline-variant rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-on-surface">
          {note ? t("notes.edit", "Edit note") : t("notes.new", "New note")}
        </span>
        <button onClick={onClose} className="text-on-surface-variant/50 hover:text-on-surface transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("notes.titlePlaceholder", "Title (optional)")}
        className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("notes.contentPlaceholder", "Write something…")}
        rows={5}
        className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y transition-colors"
      />

      {/* Reminder */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reminderOn}
            onChange={(e) => setReminderOn(e.target.checked)}
            className="accent-primary"
          />
          <Bell className="w-3.5 h-3.5" />
          {t("notes.setReminder", "Set reminder")}
        </label>
        {reminderOn && (
          <input
            type="datetime-local"
            value={reminderLocal}
            onChange={(e) => setReminderLocal(e.target.value)}
            className="px-2 py-1 bg-surface-container border border-outline-variant rounded-lg text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        )}
      </div>

      {save.error && <p className="text-xs text-error">{(save.error as Error).message}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
          {t("notes.cancel", "Cancel")}
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || (reminderOn && !reminderLocal)}
          className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {save.isPending ? t("notes.saving", "Saving…") : t("notes.save", "Save")}
        </button>
      </div>
    </div>
  );
}
