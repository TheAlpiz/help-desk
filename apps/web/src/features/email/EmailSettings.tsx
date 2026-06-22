import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { EmailSignatureBuilder } from "./EmailSignatureBuilder";
import { Button } from "@/components/ui";

export function EmailSettings() {
  const { t } = useTranslation("settings");
  const qc = useQueryClient();
  const [editingSignature, setEditingSignature] = useState<any>(null);

  const { data: signaturesData, isLoading } = useQuery({
    queryKey: ["email-signatures"],
    queryFn: async () => {
      const res = await authFetch("/api/email/signatures");
      if (!res.ok) throw new Error("Failed to load signatures");
      return res.json();
    },
  });

  const saveSignatureMutation = useMutation({
    mutationFn: async ({ html, json, id }: { html: string, json: any, id?: string | null }) => {
      let signatureId = id;
      
      // If creating new
      if (!signatureId) {
        const createRes = await authFetch("/api/email/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerType: "ORGANIZATION",
            ownerId: "00000000-0000-0000-0000-000000000000",
            name: `Global Signature ${Date.now()}`,
            isDefault: true,
          }),
        });
        if (!createRes.ok) throw new Error("Failed to create signature");
        const { data: signature } = await createRes.json();
        signatureId = signature.id;
      }

      const versionRes = await authFetch(`/api/email/signatures/${signatureId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentHtml: html,
          contentPlain: "Please view in an HTML compatible client",
          contentJson: json,
          status: "PUBLISHED"
        }),
      });
      if (!versionRes.ok) throw new Error("Failed to save version");
      return versionRes.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-signatures"] });
      setEditingSignature(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-medium text-on-surface mb-1">{t("emailSignatures.title")}</h3>
            <p className="text-sm text-on-surface-variant">{t("emailSignatures.description")}</p>
          </div>
          <Button onClick={() => setEditingSignature({ id: null, name: "New Signature", isDefault: false })}>
            {t("emailSignatures.create")}
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-white/5 rounded-lg" />
            <div className="h-16 bg-white/5 rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3">
            {signaturesData?.data?.map((sig: any) => (
              <div key={sig.id} className="flex items-center justify-between p-4 bg-surface border border-outline-variant rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-on-surface">{sig.name}</p>
                    {sig.isDefault && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] uppercase font-bold rounded">{t("emailSignatures.defaultBadge")}</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {sig.ownerType === "ORGANIZATION" ? t("emailSignatures.globalSignature") : `${sig.ownerType} Signature`}
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setEditingSignature(sig)}>
                  {t("emailSignatures.edit")}
                </Button>
              </div>
            ))}
            {signaturesData?.data?.length === 0 && (
              <div className="p-8 text-center bg-surface border border-outline-variant border-dashed rounded-lg">
                <p className="text-sm text-on-surface-variant">{t("emailSignatures.noSignatures")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {editingSignature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container-lowest w-full h-[90vh] rounded-xl overflow-hidden shadow-2xl flex flex-col border border-outline-variant">
            <div className="flex items-center justify-between p-4 border-b border-outline-variant">
              <h2 className="text-lg font-semibold text-on-surface">{t("emailSignatures.editTitle", { name: editingSignature.name })}</h2>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setEditingSignature(null)}>{t("emailSignatures.cancel")}</Button>
                <Button
                  onClick={() => {
                    // Need to grab from store, or pass callback to EmailSignatureBuilder
                  }}
                  disabled={saveSignatureMutation.isPending}
                >
                  {saveSignatureMutation.isPending ? t("emailSignatures.saving") : t("emailSignatures.save")}
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <EmailSignatureBuilder 
                signature={editingSignature} 
                onSave={(html, json) => saveSignatureMutation.mutate({ html, json, id: editingSignature.id })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
