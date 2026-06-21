import { eq, and, gt, isNull, desc } from "drizzle-orm";
import * as argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { user } from "../user/user.schema";
import { userRole } from "../user/user-role.schema";
import { organization } from "../organization/organization.schema";
import { session } from "./session.schema";
import { env } from "../../infra/env";
import { logger } from "../../infra/logger";
import { redis } from "../../infra/redis";
import { withSuperAdminTransaction, withTenantTransaction } from "../../infra/db/index";
import { PermissionService } from "../permission/permission.service";

const ACCESS_TTL = "15m" as const;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESET_TTL_SECONDS = 60 * 60; // 1 hour
const VERIFY_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");
const randomToken = () => crypto.randomBytes(40).toString("hex");

// org name -> url-safe subdomain label (max 63 chars, a-z0-9 and hyphens).
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "org";

type SessionMeta = { userAgent?: string; ipAddress?: string };

function signAccessToken(u: {
  id: string;
  organizationId: string;
  globalRole: string;
  departmentId: string | null;
  roleIds: string[];
}) {
  return jwt.sign(
    {
      userId: u.id,
      organizationId: u.organizationId,
      globalRole: u.globalRole,
      departmentId: u.departmentId,
      roleIds: u.roleIds,
    },
    env.JWT_SECRET,
    { expiresIn: ACCESS_TTL },
  );
}

// Transactional email transport for auth flows. Wire to a platform SMTP mailbox
// in production; for now the link is logged so flows are testable end-to-end.
function sendAuthEmail(to: string, subject: string, link: string) {
  logger.info({ to, subject, link }, "[Auth] Outbound auth email");
}

async function issueSession(
  tx: any,
  u: { id: string; organizationId: string },
  meta: SessionMeta,
) {
  const refreshToken = randomToken();
  await tx.insert(session).values({
    organizationId: u.organizationId,
    userId: u.id,
    tokenHash: sha256(refreshToken),
    userAgent: meta.userAgent?.slice(0, 512),
    ipAddress: meta.ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return refreshToken;
}

export const AuthService = {
  // Self-service signup. Creates an organization, seeds its system roles, creates
  // the first ADMIN user (password hashed), and returns an auto-login session.
  register: async (
    input: {
      firstName: string;
      lastName: string;
      email: string;
      organizationName: string;
      password: string;
    },
    meta: SessionMeta = {},
  ) => {
    const email = input.email.toLowerCase().trim();

    return await withSuperAdminTransaction(async (tx) => {
      // Email must be globally unique (login resolves by email without a tenant).
      const [existing] = await tx.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
      if (existing) throw new Error("An account with this email already exists");

      // Derive a unique subdomain/domain from the org name.
      const base = slugify(input.organizationName);
      let subdomain = base;
      for (let i = 0; i < 5; i++) {
        const [taken] = await tx
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.subdomain, subdomain))
          .limit(1);
        if (!taken) break;
        subdomain = `${base}-${crypto.randomBytes(2).toString("hex")}`;
      }

      const [org] = await tx
        .insert(organization)
        .values({
          name: input.organizationName,
          domain: `${subdomain}.alpis.app`,
          subdomain,
          status: "active",
        })
        .returning();

      // Standard system roles + permission matrix for the new tenant.
      await PermissionService.seedSystemRoles(tx, org.id);

      const passwordHash = await argon2.hash(input.password);
      const [newUser] = await tx
        .insert(user)
        .values({
          organizationId: org.id,
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          globalRole: "ADMIN",
          status: "active",
        })
        .returning();

      const accessToken = signAccessToken({
        id: newUser.id,
        organizationId: newUser.organizationId,
        globalRole: newUser.globalRole,
        departmentId: newUser.departmentId,
        roleIds: [],
      });
      const refreshToken = await issueSession(tx, newUser, meta);

      return {
        accessToken,
        refreshToken,
        user: {
          id: newUser.id,
          organizationId: newUser.organizationId,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          globalRole: newUser.globalRole,
          emailVerified: false,
        },
      };
    });
  },

  login: async (
    tenantId: string | undefined,
    email: string,
    passwordPlain: string,
    meta: SessionMeta = {},
  ) => {
    return await withSuperAdminTransaction(async (tx) => {
      const conditions = tenantId
        ? and(eq(user.email, email), eq(user.organizationId, tenantId))
        : eq(user.email, email);

      const [foundUser] = await tx.select().from(user).where(conditions).limit(1);
      if (!foundUser) throw new Error("Invalid credentials");
      if (foundUser.status !== "active") throw new Error("Account is not active");

      const isValid = await argon2.verify(foundUser.passwordHash, passwordPlain);
      if (!isValid) throw new Error("Invalid credentials");

      const roleRows = await tx
        .select({ roleId: userRole.roleId })
        .from(userRole)
        .where(eq(userRole.userId, foundUser.id));
      const roleIds = roleRows.map((r: { roleId: string }) => r.roleId);

      const accessToken = signAccessToken({
        id: foundUser.id,
        organizationId: foundUser.organizationId,
        globalRole: foundUser.globalRole,
        departmentId: foundUser.departmentId,
        roleIds,
      });
      const refreshToken = await issueSession(tx, foundUser, meta);

      await tx.update(user).set({ lastLoginAt: new Date() }).where(eq(user.id, foundUser.id));

      return {
        accessToken,
        refreshToken,
        user: {
          id: foundUser.id,
          organizationId: foundUser.organizationId,
          email: foundUser.email,
          firstName: foundUser.firstName,
          lastName: foundUser.lastName,
          globalRole: foundUser.globalRole,
          emailVerified: !!foundUser.emailVerifiedAt,
        },
      };
    });
  },

  // Rotating refresh: the presented token is revoked and a new pair is issued.
  refresh: async (refreshToken: string, meta: SessionMeta = {}) => {
    return await withSuperAdminTransaction(async (tx) => {
      const tokenHash = sha256(refreshToken);
      const [current] = await tx
        .select()
        .from(session)
        .where(
          and(
            eq(session.tokenHash, tokenHash),
            isNull(session.revokedAt),
            gt(session.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!current) throw new Error("Invalid or expired refresh token");

      // Revoke the used token (rotation) and mint a fresh session.
      await tx.update(session).set({ revokedAt: new Date() }).where(eq(session.id, current.id));

      const [u] = await tx.select().from(user).where(eq(user.id, current.userId)).limit(1);
      if (!u || u.status !== "active") throw new Error("User no longer active");

      const roleRows = await tx
        .select({ roleId: userRole.roleId })
        .from(userRole)
        .where(eq(userRole.userId, u.id));

      const accessToken = signAccessToken({
        id: u.id,
        organizationId: u.organizationId,
        globalRole: u.globalRole,
        departmentId: u.departmentId,
        roleIds: roleRows.map((r: { roleId: string }) => r.roleId),
      });
      const newRefresh = await issueSession(tx, u, meta);

      return { accessToken, refreshToken: newRefresh };
    });
  },

  logout: async (refreshToken: string) => {
    return await withSuperAdminTransaction(async (tx) => {
      await tx
        .update(session)
        .set({ revokedAt: new Date() })
        .where(and(eq(session.tokenHash, sha256(refreshToken)), isNull(session.revokedAt)));
      return { success: true };
    });
  },

  listSessions: async (tenantId: string, userId: string) => {
    return await withTenantTransaction(tenantId, async (tx) =>
      tx
        .select({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt,
        })
        .from(session)
        .where(eq(session.userId, userId))
        .orderBy(desc(session.createdAt)),
    );
  },

  revokeSession: async (tenantId: string, userId: string, sessionId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const updated = await tx
        .update(session)
        .set({ revokedAt: new Date() })
        .where(and(eq(session.id, sessionId), eq(session.userId, userId), isNull(session.revokedAt)))
        .returning();
      if (!updated[0]) throw new Error("Session not found");
      return { success: true };
    });
  },

  revokeAllSessions: async (tenantId: string, userId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      await tx
        .update(session)
        .set({ revokedAt: new Date() })
        .where(and(eq(session.userId, userId), isNull(session.revokedAt)));
      return { success: true };
    });
  },

  // Always resolves to success to avoid leaking which emails are registered.
  requestPasswordReset: async (email: string, tenantId?: string) => {
    await withSuperAdminTransaction(async (tx) => {
      const conditions = tenantId
        ? and(eq(user.email, email), eq(user.organizationId, tenantId))
        : eq(user.email, email);
      const [u] = await tx.select().from(user).where(conditions).limit(1);
      if (!u) return;

      const token = randomToken();
      await redis.set(`pwreset:${sha256(token)}`, u.id, { EX: RESET_TTL_SECONDS });
      sendAuthEmail(u.email, "Reset your password", `${env.APP_BASE_URL}/reset-password?token=${token}`);
    });
    return { success: true };
  },

  resetPassword: async (token: string, newPassword: string) => {
    const key = `pwreset:${sha256(token)}`;
    const userId = await redis.get(key);
    if (!userId) throw new Error("Invalid or expired reset token");

    const passwordHash = await argon2.hash(newPassword);
    const tenantId = await withSuperAdminTransaction(async (tx) => {
      const [u] = await tx.select().from(user).where(eq(user.id, userId)).limit(1);
      if (!u) throw new Error("User not found");
      await tx.update(user).set({ passwordHash }).where(eq(user.id, userId));
      // Invalidate every existing session — password change kills all logins.
      await tx.update(session).set({ revokedAt: new Date() }).where(eq(session.userId, userId));
      return u.organizationId;
    });

    await redis.del(key);
    await PermissionService.invalidateUser(tenantId, userId);
    return { success: true };
  },

  requestEmailVerification: async (tenantId: string, userId: string) => {
    return await withTenantTransaction(tenantId, async (tx) => {
      const [u] = await tx.select().from(user).where(eq(user.id, userId)).limit(1);
      if (!u) throw new Error("User not found");
      if (u.emailVerifiedAt) return { success: true, alreadyVerified: true };

      const token = randomToken();
      await redis.set(`verify:${sha256(token)}`, u.id, { EX: VERIFY_TTL_SECONDS });
      sendAuthEmail(u.email, "Verify your email", `${env.APP_BASE_URL}/verify-email?token=${token}`);
      return { success: true };
    });
  },

  verifyEmail: async (token: string) => {
    const key = `verify:${sha256(token)}`;
    const userId = await redis.get(key);
    if (!userId) throw new Error("Invalid or expired verification token");

    await withSuperAdminTransaction(async (tx) => {
      await tx.update(user).set({ emailVerifiedAt: new Date() }).where(eq(user.id, userId));
    });
    await redis.del(key);
    return { success: true };
  },
};
