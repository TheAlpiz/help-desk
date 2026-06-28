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

type Available = { installationId: string; accountLogin: string | null; accountType: string | null };

function GithubSetupPage() {
  const { t } = useTranslation("github");
  const navigate = useNavigate();
  const { installation_id } = Route.useSearch();
  const [state, setState] = useState<"working" | "done" | "error" | "pick">("working");
  const [message, setMessage] = useState<string>("");
  const [options, setOptions] = useState<Available[]>([]);
  // StrictMode mounts twice in dev — guard the one-shot effect.
  const ran = useRef(false);

  const connect = async (id: string) => {
    setState("working");
    try {
      const res = await api.github.installations.$post({ json: { installationId: id } });
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
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // Happy path: GitHub passed the installation id on the redirect.
      if (installation_id) {
        await connect(installation_id);
        return;
      }
      // Fallback: GitHub omitted it (app already installed). Discover the App's
      // installations server-side; auto-connect if there's exactly one.
      try {
        const res = await api.github.installations.available.$get();
        if (!res.ok) throw new Error("Failed");
        const list = (((await res.json()) as any)?.data ?? []) as Available[];
        if (list.length === 0) {
          setState("error");
          setMessage(t("setup.missingId"));
        } else if (list.length === 1) {
          await connect(list[0].installationId);
        } else {
          setOptions(list);
          setState("pick");
        }
      } catch (err: any) {
        setState("error");
        setMessage(err.message ?? t("setup.failed"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installation_id]);

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <GitBranch className="w-8 h-8 mx-auto text-primary" />
      {state === "working" && (
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("setup.connecting")}
        </div>
      )}
      {state === "pick" && (
        <div className="space-y-2">
          <p className="text-sm text-on-surface-variant">{t("setup.pick")}</p>
          {options.map((o) => (
            <button
              key={o.installationId}
              onClick={() => connect(o.installationId)}
              className="w-full px-3 py-2 text-sm bg-surface-container-high border border-outline-variant rounded-lg hover:border-primary/50 transition-colors text-on-surface"
            >
              {o.accountLogin ?? o.installationId} <span className="text-on-surface-variant/50">({o.accountType ?? "?"})</span>
            </button>
          ))}
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
