import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, ExternalLink, Unplug, CheckCircle2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store";

export const Route = createFileRoute("/_auth/github")({
  component: GithubIntegrationPage,
});

type Installation = {
  installationId: string;
  accountLogin: string | null;
  accountType: string | null;
  suspended: boolean;
  connectedByUserId: string | null;
  mine: boolean;
};

function GithubIntegrationPage() {
  const { t } = useTranslation("github");
  const queryClient = useQueryClient();
  const role = useAppStore((s) => s.user?.globalRole);
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["github", "installation"],
    queryFn: async () => {
      const res = await api.github.installation.$get();
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const status = (statusData as any)?.data as
    | { configured: boolean; connected: boolean; installations: Installation[] }
    | undefined;
  const installations = status?.installations ?? [];

  const { data: reposData } = useQuery({
    queryKey: ["github", "repos"],
    enabled: Boolean(status?.connected),
    queryFn: async () => {
      const res = await api.github.repos.$get();
      if (!res.ok) return [];
      const json = (await res.json().catch(() => null)) as any;
      return (json?.data ?? []) as Array<{ id: number; fullName: string; accountLogin: string | null }>;
    },
  });
  const repos = reposData ?? [];

  const connectMut = useMutation({
    mutationFn: async () => {
      const res = await api.github["install-url"].$get();
      if (!res.ok) throw new Error("Failed to get install URL");
      const json = (await res.json()) as any;
      return json?.data?.url as string;
    },
    onSuccess: (url) => {
      if (url) window.location.href = url;
    },
  });

  const disconnectMut = useMutation({
    mutationFn: async (installationId: string) => {
      await api.github.installations[":installationId"].$delete({
        param: { installationId },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["github"] }),
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2.5">
        <GitBranch className="w-5 h-5 text-primary" />
        <div>
          <h1 className="text-[15px] font-semibold text-on-surface">{t("title")}</h1>
          <p className="text-xs text-on-surface-variant/60">{t("subtitle")}</p>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
        {isLoading ? (
          <p className="text-sm text-on-surface-variant/40">…</p>
        ) : !status?.configured ? (
          <p className="text-sm text-amber-300">{t("notConfigured")}</p>
        ) : (
          <>
            {installations.length === 0 ? (
              <p className="text-sm text-on-surface-variant">{t("notConnected")}</p>
            ) : (
              <div className="space-y-2">
                <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                  {t("connectedAccounts")}
                </h4>
                {installations.map((inst) => (
                  <div
                    key={inst.installationId}
                    className="flex items-center gap-3 px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg"
                  >
                    <CheckCircle2 className={`w-4 h-4 ${inst.suspended ? "text-amber-400" : "text-emerald-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-on-surface truncate">
                        {inst.accountLogin ?? inst.installationId}
                        <span className="text-on-surface-variant/40 text-xs ml-1.5">({inst.accountType ?? "?"})</span>
                      </p>
                      {inst.suspended && <p className="text-[11px] text-amber-300">{t("suspended")}</p>}
                    </div>
                    {(inst.mine || isAdmin) && (
                      <button
                        onClick={() => disconnectMut.mutate(inst.installationId)}
                        disabled={disconnectMut.isPending}
                        aria-label={t("disconnect")}
                        className="text-on-surface-variant/40 hover:text-error transition-colors disabled:opacity-40"
                        title={t("disconnect")}
                      >
                        <Unplug className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Connect another account — any member may add their own. */}
            <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending} variant={installations.length ? "secondary" : "primary"}>
              {installations.length ? <Plus className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
              {installations.length ? t("connectAnother") : t("connect")}
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>

            {/* Repos across all connected accounts. */}
            {repos.length > 0 && (
              <div>
                <h4 className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-2">
                  {t("repos")} ({repos.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {repos.map((r) => (
                    <span
                      key={r.id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-outline-variant text-on-surface-variant"
                    >
                      {r.fullName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
