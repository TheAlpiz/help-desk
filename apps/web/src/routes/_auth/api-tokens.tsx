import { createFileRoute } from "@tanstack/react-router";
import { Key, Shield, Zap, Code2, Lock, RefreshCw } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_auth/api-tokens")({
  component: ApiTokens,
});

function ApiTokens() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">API Tokens</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Create personal access tokens for API integrations.
        </p>
      </div>

      <ComingSoon
        icon={Key}
        iconColor="text-amber-400"
        iconBg="bg-amber-400/10 border-amber-400/20"
        title="Personal API tokens"
        description="Generate scoped access tokens to integrate Alpis with your tools, scripts, CI pipelines, and third-party services."
        badge="In development"
        eta="Q3 2025"
        features={[
          {
            icon: Shield,
            label: "Fine-grained scopes",
            description: "Limit each token to exactly the permissions it needs — tickets:read, users:write, and more.",
          },
          {
            icon: Lock,
            label: "Secure by design",
            description: "Tokens are shown once at creation. Only a hashed prefix is stored — never the secret.",
          },
          {
            icon: Zap,
            label: "Instant revocation",
            description: "Revoke any token immediately without affecting other integrations.",
          },
          {
            icon: RefreshCw,
            label: "Last-used tracking",
            description: "See exactly when each token was last used to audit and clean up stale keys.",
          },
          {
            icon: Code2,
            label: "Full REST access",
            description: "Authenticate any API request — list tickets, update statuses, trigger automations.",
          },
        ]}
      />
    </div>
  );
}
