import { z } from "zod";

// Setup-callback payload: the installation_id GitHub appends to the redirect.
export const connectInstallationSchema = z.object({
  installationId: z.string().min(1).max(64),
});

// Link an existing task to a repo (owner/repo). Branch name is server-generated.
export const linkTaskSchema = z.object({
  repoFullName: z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, "Invalid repo (expected owner/repo)"),
});

// Response shapes (frontend typing).
export const githubRepoSchema = z.object({
  id: z.number(),
  fullName: z.string(),
  defaultBranch: z.string(),
  private: z.boolean(),
  htmlUrl: z.string(),
});

export const githubInstallationStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  installation: z
    .object({
      accountLogin: z.string().nullable(),
      accountType: z.string().nullable(),
      suspended: z.boolean(),
    })
    .nullable(),
});

export const taskGithubLinkSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  repoFullName: z.string(),
  branchName: z.string(),
  branchUrl: z.string().nullable(),
  prNumber: z.number().nullable(),
  prUrl: z.string().nullable(),
  baseBranch: z.string().nullable(),
});

export type ConnectInstallationInput = z.infer<typeof connectInstallationSchema>;
export type LinkTaskInput = z.infer<typeof linkTaskSchema>;
export type GithubRepoDto = z.infer<typeof githubRepoSchema>;
export type GithubInstallationStatusDto = z.infer<
  typeof githubInstallationStatusSchema
>;
export type TaskGithubLinkDto = z.infer<typeof taskGithubLinkSchema>;
