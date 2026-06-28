import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { GitBranch, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// GitHub redirects here after the App is installed, appending ?installation_id=...&setup_action=install
export const Route = createFileRoute("/_auth/github_/setup")({
  validateSearch: (search: Record<string, unknown>) => ({
    installation_id: typeof search.installation_id === "string" ? search.installation_id : undefined,
    setup_action: typeof search.setup_action === "string" ? search.setup_action : undefined,
  }),
  component: GithubSetupPage,
});

function GithubSetupPage() {
  const { t } = useTranslation("github");
  const navigate = useNavigate();
  const { installation_id } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string>("");
  // StrictMode mounts twice in dev — guard the one-shot POST.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!installation_id) {
      setState("error");
      setMessage(t("setup.missingId"));
      return;
    }

    (async () => {
      try {
        const res = await api.github.installations.$post({
          json: { installationId: installation_id },
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error?.message ?? "Failed");
        }
        setState("done");
        setTimeout(() => navigate({ to: "/github" }), 1500);
      } catch (err: any) {
        setState("error");
        setMessage(err.message ?? t("setup.failed"));
      }
    })();
  }, [installation_id, navigate, t]);

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <GitBranch className="w-8 h-8 mx-auto text-primary" />
      {state === "working" && (
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("setup.connecting")}
        </div>
      )}
      {state === "done" && (
        <div className="flex items-center justify-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />
          {t("setup.success")}
        </div>
      )}
      {state === "error" && (
        <div className="flex items-center justify-center gap-2 text-sm text-error">
          <AlertCircle className="w-4 h-4" />
          {message}
        </div>
      )}
    </div>
  );
}
