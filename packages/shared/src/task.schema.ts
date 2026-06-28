import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  ticketId: z.string().uuid().optional().nullable(),
  parentTaskId: z.string().uuid().optional().nullable(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  // Optional: link the new task to a GitHub repo. The backend auto-creates a branch
  // (and draft PR) asynchronously. Format: "owner/repo".
  githubRepoFullName: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, "Invalid repo (expected owner/repo)")
    .optional()
    .nullable(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "REVIEW", "DONE", "CANCELED"]),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid(),
});

export const addTaskCommentSchema = z.object({
  content: z.string().min(1),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    ticketId: z.string().uuid().nullable().optional(),
    parentTaskId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "validation.atLeastOneField",
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;
export type AddTaskCommentInput = z.infer<typeof addTaskCommentSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
