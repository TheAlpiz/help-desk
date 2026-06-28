import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, ShieldOff, ExternalLink, Unplug, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui";
import { useAppStore } from "@/store";

export const Route = createFileRoute("/_auth/github")({
  component: GithubIntegrationPage,
});

function GithubIntegrationPage() {
  const { t } = useTranslation("github");
  const queryClient = useQueryClient();
  const role = useAppStore((s) => s.user?.globalRole);
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  const { data: statusData, isLoading } = useQuery({
    queryKey: ["github", "installation"],
    enabled: isAdmin,
    queryFn: async () => {
      const res = await api.github.installation.$get();
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const status = (statusData as any)?.data as
    | {
        configured: boolean;
        connected: boolean;
        installation: { accountLogin: string | null; accountType: string | null; suspended: boolean } | null;
      }
    | undefined;

  const { data: reposData } = useQuery({
    queryKey: ["github", "repos"],
    enabled: isAdmin && Boolean(status?.connected),
    queryFn: async () => {
      const res = await api.github.repos.$get();
      if (!res.ok) return [];
      const json = (await res.json().catch(() => null)) as any;
      return (json?.data ?? []) as Array<{ id: number; fullName: string; private: boolean }>;
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
    mutationFn: async () => {
      await api.github.installation.$delete();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["github"] }),
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-on-surface-variant/60">
        <ShieldOff className="w-6 h-6 mx-auto mb-2 opacity-40" />
        {t("adminOnly")}
      </div>
    );
  }

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
        ) : status.connected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-on-surface">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {t("connectedAs", { account: status.installation?.accountLogin ?? "—" })}
            </div>
            {status.installation?.suspended && (
              <p className="text-xs text-amber-300">{t("suspended")}</p>
            )}
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
            <Button variant="secondary" onClick={() => disconnectMut.mutate()} disabled={disconnectMut.isPending}>
              <Unplug className="w-4 h-4" />
              {t("disconnect")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-on-surface-variant">{t("notConnected")}</p>
            <Button onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
              <GitBranch className="w-4 h-4" />
              {t("connect")}
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
