import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store";
import { EmailSignatureBuilder } from "./EmailSignatureBuilder";
import { Button } from "@/components/ui";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const MANAGER_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPERVISOR"];

export function EmailSettings() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const user = useAppStore((s) => s.user);
  const [editingSignature, setEditingSignature] = useState<any>(null);

  const isAdmin = ADMIN_ROLES.includes(user?.globalRole ?? "");

  const { data: signaturesData, isLoading } = useQuery({
    queryKey: ["email-signatures"],
    queryFn: async () => {
      const res = await authFetch("/api/email/signatures");
      if (!res.ok) throw new Error("Failed to load signatures");
      return res.json();
    },
  });

  const saveSignatureMutation = useMutation({
    mutationFn: async ({
      html,
      json,
      id,
      name,
      isDefault,
    }: {
      html: string;
      json: any;
      id?: string | null;
      name: string;
      isDefault: boolean;
    }) => {
      let signatureId = id;

      if (!signatureId) {
        const ownerType = isAdmin ? "ORGANIZATION" : "AGENT";
        const ownerId = isAdmin ? (user?.organizationId ?? "") : (user?.id ?? "");

        const createRes = await authFetch("/api/email/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerType, ownerId, name, isDefault }),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          throw new Error((err as any).error ?? "Failed to create signature");
        }
        const { data: signature } = await createRes.json();
        signatureId = signature.id;
      } else {
        // Update name / isDefault on the existing record
        await authFetch(`/api/email/signatures/${signatureId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, isDefault }),
        });
      }

      const versionRes = await authFetch(`/api/email/signatures/${signatureId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentHtml: html,
          contentPlain: "Please view in an HTML compatible client",
          contentJson: json,
          status: "PUBLISHED",
        }),
      });
      if (!versionRes.ok) throw new Error("Failed to save signature version");
      return versionRes.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-signatures"] });
      setEditingSignature(null);
    },
  });

  const signatures: any[] = signaturesData?.data ?? [];
  const ownSignatures = signatures.filter(
    (s) => s.ownerType === "AGENT" && s.ownerId === user?.id,
  );
  const orgSignatures = signatures.filter((s) => s.ownerType === "ORGANIZATION");
  const deptSignatures = signatures.filter((s) => s.ownerType === "DEPARTMENT");

  return (
    <div className="space-y-4">
      {/* ── My personal signature (all roles) ───────────────────────────── */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">
              {isAdmin ? t("emailSignatures.title") : "My Signature"}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isAdmin
                ? t("emailSignatures.description")
                : "Appended to emails you send personally."}
            </p>
          </div>
          <Button
            onClick={() =>
              setEditingSignature({ id: null, name: "", isDefault: false })
            }
          >
            {t("emailSignatures.create")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-14 bg-surface-container-high rounded-lg" />
          </div>
        ) : (
          <div className="space-y-2">
            {(isAdmin ? orgSignatures : ownSignatures).map((sig) => (
              <SignatureRow
                key={sig.id}
                sig={sig}
                onEdit={() => setEditingSignature(sig)}
                t={t}
              />
            ))}
            {(isAdmin ? orgSignatures : ownSignatures).length === 0 && (
              <EmptyState label={t("emailSignatures.noSignatures")} />
            )}
            {/* Admins: also show dept signatures */}
            {isAdmin && deptSignatures.length > 0 && (
              <>
                <p className="text-xs font-semibold text-on-surface-variant pt-3 pb-1">
                  Department Signatures
                </p>
                {deptSignatures.map((sig) => (
                  <SignatureRow
                    key={sig.id}
                    sig={sig}
                    onEdit={() => setEditingSignature(sig)}
                    t={t}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Org-level view for non-admins: read-only org signature preview ─ */}
      {!isAdmin && orgSignatures.length > 0 && (
        <div className="bg-surface-container border border-outline-variant rounded-xl p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-3">Organization Signature</h3>
          <p className="text-xs text-on-surface-variant mb-3">
            Fallback used when you have no personal signature set.
          </p>
          <div className="space-y-2">
            {orgSignatures.map((sig) => (
              <div
                key={sig.id}
                className="flex items-center gap-3 p-3 bg-surface border border-outline-variant rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{sig.name}</p>
                  <p className="text-xs text-on-surface-variant">Organization · read-only</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Editor modal ─────────────────────────────────────────────────── */}
      {editingSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container-lowest w-full h-[92vh] rounded-xl overflow-hidden shadow-2xl border border-outline-variant">
            <EmailSignatureBuilder
              signature={editingSignature}
              onSave={(html, json, name, isDefault) =>
                saveSignatureMutation.mutate({ html, json, name, isDefault, id: editingSignature.id })
              }
              onCancel={() => setEditingSignature(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SignatureRow({ sig, onEdit, t }: { sig: any; onEdit: () => void; t: any }) {
  const ownerLabel =
    sig.ownerType === "ORGANIZATION"
      ? t("emailSignatures.globalSignature")
      : sig.ownerType === "DEPARTMENT"
        ? "Department"
        : "Personal";

  return (
    <div className="flex items-center justify-between p-3 bg-surface border border-outline-variant rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-on-surface truncate">{sig.name}</p>
          {sig.isDefault && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] uppercase font-bold rounded shrink-0">
              {t("emailSignatures.defaultBadge")}
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant mt-0.5">{ownerLabel}</p>
      </div>
      <Button variant="secondary" onClick={onEdit}>
        {t("emailSignatures.edit")}
      </Button>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center border border-dashed border-outline-variant rounded-lg">
      <p className="text-sm text-on-surface-variant">{label}</p>
    </div>
  );
}
