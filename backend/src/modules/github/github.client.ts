import { createHmac, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../infra/env";

// ─── Pure GitHub REST client ──────────────────────────────────────────────────
// No DB, no tenant context. Each function takes the credentials it needs. Token
// caching, persistence and tenant scoping live in github.service.ts.

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";
const USER_AGENT = "help-desk-app";

export class GithubNotConfiguredError extends Error {
  constructor() {
    super("GitHub App is not configured on this server.");
    this.name = "GithubNotConfiguredError";
  }
}

export class GithubApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    body: string,
  ) {
    super(`GitHub API ${status} on ${endpoint}: ${body}`);
    this.name = "GithubApiError";
  }
}

export function isGithubConfigured(): boolean {
  return Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);
}

// Restore real newlines when the PEM is supplied as a single-line env var.
function privateKey(): string {
  return env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n");
}

/**
 * Short-lived (10 min) RS256 JWT authenticating *as the App* (not an installation).
 * Used only to mint installation tokens and read installation metadata.
 */
export function generateAppJwt(): string {
  if (!isGithubConfigured()) throw new GithubNotConfiguredError();
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iat: now - 60, // clock-skew tolerance
      exp: now + 540, // 9 min (GitHub max is 10)
      iss: env.GITHUB_APP_ID,
    },
    privateKey(),
    { algorithm: "RS256" },
  );
}

type Auth = { type: "app" } | { type: "token"; token: string };

async function request<T>(
  method: string,
  endpoint: string,
  auth: Auth,
  body?: unknown,
): Promise<T> {
  const bearer = auth.type === "app" ? generateAppJwt() : auth.token;
  const res = await fetch(`${GITHUB_API}${endpoint}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${bearer}`,
      "X-GitHub-Api-Version": API_VERSION,
      "User-Agent": USER_AGENT,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new GithubApiError(res.status, endpoint, text);
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ─── App-authenticated calls ──────────────────────────────────────────────────

export interface InstallationToken {
  token: string;
  expires_at: string; // ISO
}

export function getInstallationToken(installationId: string) {
  return request<InstallationToken>(
    "POST",
    `/app/installations/${installationId}/access_tokens`,
    { type: "app" },
  );
}

export interface InstallationInfo {
  id: number;
  account: { login: string; type: string } | null;
  suspended_at: string | null;
}

export function getInstallation(installationId: string) {
  return request<InstallationInfo>(
    "GET",
    `/app/installations/${installationId}`,
    { type: "app" },
  );
}

// All installations of this App (across accounts). Used as a fallback when the
// post-install redirect doesn't carry installation_id (already-installed apps).
export function listAppInstallations() {
  return request<InstallationInfo[]>("GET", `/app/installations?per_page=100`, {
    type: "app",
  });
}

// ─── Installation-token calls ─────────────────────────────────────────────────

export interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
}

export async function listInstallationRepos(token: string): Promise<GithubRepo[]> {
  // Single page (100) is plenty for a repo picker; paginate later if needed.
  const data = await request<{ repositories: GithubRepo[] }>(
    "GET",
    `/installation/repositories?per_page=100`,
    { type: "token", token },
  );
  return data.repositories;
}

export function getRepo(token: string, owner: string, repo: string) {
  return request<GithubRepo>("GET", `/repos/${owner}/${repo}`, {
    type: "token",
    token,
  });
}

export interface GitRef {
  ref: string;
  object: { sha: string; type: string };
}

export function getBranchRef(
  token: string,
  owner: string,
  repo: string,
  branch: string,
) {
  return request<GitRef>(
    "GET",
    `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { type: "token", token },
  );
}

export function createBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
) {
  return request<GitRef>(
    "POST",
    `/repos/${owner}/${repo}/git/refs`,
    { type: "token", token },
    { ref: `refs/heads/${branch}`, sha },
  );
}

export interface PullRequest {
  number: number;
  html_url: string;
}

export function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  params: { title: string; head: string; base: string; body?: string; draft?: boolean },
) {
  return request<PullRequest>(
    "POST",
    `/repos/${owner}/${repo}/pulls`,
    { type: "token", token },
    params,
  );
}

// ─── Webhook signature verification ───────────────────────────────────────────

/**
 * Verify a GitHub webhook delivery's `X-Hub-Signature-256` against the raw request
 * body using HMAC-SHA256. Constant-time compare; tolerant of malformed headers.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined | null,
  secret: string,
): boolean {
  if (!secret || !signatureHeader) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
