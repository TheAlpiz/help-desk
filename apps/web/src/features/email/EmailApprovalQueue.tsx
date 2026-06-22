import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { authFetch } from "@/lib/api";
import { CheckCircle2, XCircle, Clock, Send } from "lucide-react";

interface PendingApproval {
  approval: {
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  };
  version: {
    id: string;
    subject: string;
    versionNumber: number;
    status: string;
  };
  template: {
    id: string;
    name: string;
    templateType: string;
  };
}

export function EmailApprovalQueue() {
  const qc = useQueryClient();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["email-approvals-pending"],
    queryFn: () => authFetch("/api/email/approvals/pending").then((r) => r.json()),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ approvalId, decision, notes }: { approvalId: string; decision: "APPROVED" | "REJECTED"; notes?: string }) =>
      authFetch(`/api/email/approvals/${approvalId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-approvals-pending"] });
      setReviewingId(null);
      setNotes("");
    },
  });

  const pending: PendingApproval[] = data?.data ?? [];

  if (isLoading) {
    return <div className="p-4 text-sm text-on-surface-variant">Loading approvals...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-on-surface">Pending Approvals</h3>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            {pending.length}
          </span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
          <p className="text-sm text-on-surface-variant">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(({ approval, version, template }) => (
            <div
              key={approval.id}
              className="bg-surface border border-outline-variant rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-on-surface">{template.name}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {template.templateType.replace(/_/g, " ")} · Version {version.versionNumber}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Subject: <span className="text-on-surface">{version.subject}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setReviewingId(reviewingId === approval.id ? null : approval.id)}
                    className="px-3 py-1.5 bg-surface-container border border-outline-variant rounded-lg text-xs text-on-surface hover:bg-surface-container-high transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>

              <p className="text-xs text-on-surface-variant">
                Requested {new Date(approval.createdAt).toLocaleString()}
              </p>

              {reviewingId === approval.id && (
                <div className="space-y-3 pt-3 border-t border-outline-variant">
                  <div>
                    <label className="block text-xs font-medium text-on-surface-variant mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Leave feedback for the author..."
                      className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm resize-none h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        reviewMutation.mutate({ approvalId: approval.id, decision: "APPROVED", notes })
                      }
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve & Publish
                    </button>
                    <button
                      onClick={() =>
                        reviewMutation.mutate({ approvalId: approval.id, decision: "REJECTED", notes })
                      }
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-error text-on-error rounded-lg text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Request approval button (used inside EmailTemplateBuilder toolbar) ────────

export function RequestApprovalButton({ versionId }: { versionId?: string }) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (versionId: string) =>
      authFetch(`/api/email/versions/${versionId}/request-approval`, { method: "POST" }).then(
        (r) => r.json(),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-approvals-pending"] }),
  });

  if (!versionId) return null;

  return (
    <button
      onClick={() => mutation.mutate(versionId)}
      disabled={mutation.isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
    >
      <Send className="w-4 h-4" />
      {mutation.isPending ? "Submitting..." : "Request Approval"}
    </button>
  );
}
