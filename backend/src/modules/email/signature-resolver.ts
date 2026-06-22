import { and, eq, asc } from "drizzle-orm";
import { db } from "../../infra/db";
import { emailSignature, signatureVersion, signatureRule } from "./email.schema";
import { user } from "../user/user.schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface SignatureContext {
  ticketId?: string | null;
  mailboxId?: string | null;
  departmentId?: string | null;
  priority?: string | null;
}

/**
 * Resolves the correct email signature using:
 *   0. Signature rules (priority-ordered, evaluated first)
 *   1. Agent personal default
 *   2. Agent's department default
 *   3. Organization-wide default
 */
export async function resolveSignature(
  tx: Tx,
  organizationId: string,
  senderId?: string | null,
  ctx?: SignatureContext,
): Promise<string | null> {
  // ── Tier 0: Signature rules (highest precedence) ─────────────────────
  const ruleResult = await evaluateSignatureRules(tx, organizationId, senderId, ctx);
  if (ruleResult !== null) return ruleResult;

  // ── Tier 1: Agent personal signature ────────────────────────────────
  if (senderId) {
    const agentSig = await fetchDefaultSignatureHtml(tx, "AGENT", senderId);
    if (agentSig !== null) return agentSig;
  }

  // ── Tier 2: Agent's department signature ────────────────────────────
  if (senderId) {
    const [agentRow] = await tx
      .select({ departmentId: user.departmentId })
      .from(user)
      .where(eq(user.id, senderId))
      .limit(1);

    if (agentRow?.departmentId) {
      const deptSig = await fetchDefaultSignatureHtml(tx, "DEPARTMENT", agentRow.departmentId);
      if (deptSig !== null) return deptSig;
    }
  }

  // ── Tier 3: Organization-wide signature ─────────────────────────────
  return fetchDefaultSignatureHtml(tx, "ORGANIZATION", organizationId);
}

async function evaluateSignatureRules(
  tx: Tx,
  organizationId: string,
  senderId?: string | null,
  ctx?: SignatureContext,
): Promise<string | null> {
  const rules = await tx
    .select()
    .from(signatureRule)
    .where(and(eq(signatureRule.organizationId, organizationId), eq(signatureRule.isActive, true)))
    .orderBy(asc(signatureRule.priority));

  // Build evaluation context (fetch agent dept if needed)
  let agentDepartmentId: string | null = null;
  if (senderId && rules.some((r) => r.conditions.some((c) => c.field === "departmentId"))) {
    const [agentRow] = await tx
      .select({ departmentId: user.departmentId })
      .from(user)
      .where(eq(user.id, senderId))
      .limit(1);
    agentDepartmentId = agentRow?.departmentId ?? null;
  }

  const evalCtx: Record<string, string | null> = {
    mailboxId: ctx?.mailboxId ?? null,
    ticketId: ctx?.ticketId ?? null,
    departmentId: ctx?.departmentId ?? agentDepartmentId,
    agentId: senderId ?? null,
    ticketPriority: ctx?.priority ?? null,
  };

  for (const rule of rules) {
    if (matchesAllConditions(rule.conditions, evalCtx)) {
      const html = await fetchSignatureHtmlById(tx, rule.signatureId);
      if (html !== null) return html;
    }
  }

  return null;
}

type Condition = { field: string; op: string; value: string | string[] };

function matchesAllConditions(conditions: Condition[], ctx: Record<string, string | null>): boolean {
  return conditions.every((cond) => {
    const ctxVal = ctx[cond.field];
    if (ctxVal === null || ctxVal === undefined) return false;

    switch (cond.op) {
      case "eq":
        return ctxVal === cond.value;
      case "neq":
        return ctxVal !== cond.value;
      case "in":
        return Array.isArray(cond.value) && cond.value.includes(ctxVal);
      case "nin":
        return Array.isArray(cond.value) && !cond.value.includes(ctxVal);
      default:
        return false;
    }
  });
}

async function fetchSignatureHtmlById(tx: Tx, signatureId: string): Promise<string | null> {
  const [version] = await tx
    .select({ contentHtml: signatureVersion.contentHtml })
    .from(signatureVersion)
    .where(
      and(eq(signatureVersion.signatureId, signatureId), eq(signatureVersion.status, "PUBLISHED")),
    )
    .orderBy(asc(signatureVersion.versionNumber))
    .limit(1);
  return version?.contentHtml ?? null;
}

async function fetchDefaultSignatureHtml(
  tx: Tx,
  ownerType: "ORGANIZATION" | "DEPARTMENT" | "AGENT",
  ownerId: string,
): Promise<string | null> {
  const [sig] = await tx
    .select({ id: emailSignature.id })
    .from(emailSignature)
    .where(
      and(
        eq(emailSignature.ownerType, ownerType),
        eq(emailSignature.ownerId, ownerId),
        eq(emailSignature.isDefault, true),
      ),
    )
    .limit(1);

  if (!sig) return null;
  return fetchSignatureHtmlById(tx, sig.id);
}

export function wrapSignature(signatureHtml: string): string {
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">${signatureHtml}</div>`;
}
