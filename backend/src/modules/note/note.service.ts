import { and, desc, eq } from "drizzle-orm";
import { withTenantTransaction } from "../../infra/db";
import { userNote, NewUserNote } from "./note.schema";
import { reminderQueue, reminderJobId } from "../../workers/reminder.worker";
import { CreateNoteInput, UpdateNoteInput } from "@help-desk/shared";

// Schedule (or cancel) the delayed BullMQ job that fires a note's reminder.
// Idempotent: always removes any existing job for the note first.
async function scheduleReminder(noteId: string, reminderAt: Date | null) {
  const jobId = reminderJobId(noteId);
  await reminderQueue.remove(jobId).catch(() => {});
  if (!reminderAt) return;
  const delay = reminderAt.getTime() - Date.now();
  if (delay <= 0) return; // past times never fire
  await reminderQueue.add(
    "fire",
    { noteId },
    { jobId, delay, removeOnComplete: true, removeOnFail: true },
  );
}

export const NoteService = {
  // Private: every query is scoped to the owning user, never just the tenant.
  list: async (tenantId: string, userId: string) => {
    return withTenantTransaction(tenantId, async (tx) =>
      tx
        .select()
        .from(userNote)
        .where(and(eq(userNote.organizationId, tenantId), eq(userNote.userId, userId)))
        .orderBy(desc(userNote.updatedAt)),
    );
  },

  create: async (tenantId: string, userId: string, input: CreateNoteInput) => {
    const reminderAt = input.reminderAt ? new Date(input.reminderAt) : null;
    const values: NewUserNote = {
      organizationId: tenantId,
      userId,
      title: input.title ?? null,
      content: input.content ?? "",
      reminderAt,
      reminderFired: false,
    };
    const note = await withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx.insert(userNote).values(values).returning();
      return row;
    });
    await scheduleReminder(note.id, reminderAt);
    return note;
  },

  update: async (tenantId: string, userId: string, id: string, input: UpdateNoteInput) => {
    return withTenantTransaction(tenantId, async (tx) => {
      const [existing] = await tx
        .select()
        .from(userNote)
        .where(
          and(eq(userNote.id, id), eq(userNote.organizationId, tenantId), eq(userNote.userId, userId)),
        )
        .limit(1);
      if (!existing) throw new Error("Note not found");

      const patch: Partial<NewUserNote> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.content !== undefined) patch.content = input.content;

      let reschedule: Date | null | undefined;
      if (input.reminderAt !== undefined) {
        reschedule = input.reminderAt ? new Date(input.reminderAt) : null;
        patch.reminderAt = reschedule;
        // A changed reminder is fresh again, so it can fire.
        patch.reminderFired = false;
      }
      patch.updatedAt = new Date();

      const [updated] = await tx
        .update(userNote)
        .set(patch)
        .where(eq(userNote.id, id))
        .returning();

      if (reschedule !== undefined) await scheduleReminder(id, reschedule);
      return updated;
    });
  },

  remove: async (tenantId: string, userId: string, id: string) => {
    const deleted = await withTenantTransaction(tenantId, async (tx) => {
      const [row] = await tx
        .delete(userNote)
        .where(
          and(eq(userNote.id, id), eq(userNote.organizationId, tenantId), eq(userNote.userId, userId)),
        )
        .returning({ id: userNote.id });
      return row;
    });
    if (!deleted) throw new Error("Note not found");
    await scheduleReminder(id, null); // cancel any pending reminder
    return { id };
  },
};
