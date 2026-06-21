import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Monitor, Trash2, LogOut, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAppStore } from "@/store";
import { Button, FormAlert } from "@/components/ui";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/account-security")({
  component: SecuritySettings,
});

function SecuritySettings() {
  const navigate = useNavigate();
  const logout = useAppStore((s) => s.logout);
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [showPass, setShowPass] = useState(false);
  const [newPwd, setNewPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdError, setPwdError] = useState<string | null>(null);

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await api.auths.sessions.$get();
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  const sessions: any[] = (sessionsData as any)?.data ?? [];

  const revokeOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.auths.sessions[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to revoke session");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      success("Session revoked");
    },
    onError: (err: any) => toastError(err.message),
  });

  const revokeAll = useMutation({
    mutationFn: async () => {
      const res = await api.auths.sessions.$delete();
      if (!res.ok) throw new Error("Failed to revoke sessions");
    },
    onSuccess: () => {
      logout();
      navigate({ to: "/login" });
    },
    onError: (err: any) => toastError(err.message),
  });

  const changePassword = async () => {
    setPwdError(null);
    if (newPwd.next.length < 8) {
      setPwdError("Password must be at least 8 characters");
      return;
    }
    if (newPwd.next !== newPwd.confirm) {
      setPwdError("Passwords do not match");
      return;
    }
    // TODO: wire to backend change-password endpoint when available
    success("Password changed (stub — backend endpoint pending)");
    setNewPwd({ current: "", next: "", confirm: "" });
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-[15px] font-semibold text-on-surface">Security</h1>
        <p className="text-xs text-on-surface-variant mt-1">Manage your password and active sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Change password */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-on-surface-variant" />
          <h2 className="text-sm font-semibold text-on-surface">Change Password</h2>
        </div>

        <FormAlert>{pwdError ?? undefined}</FormAlert>

        {(["current", "next", "confirm"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-on-surface capitalize">
              {key === "next" ? "New password" : key === "confirm" ? "Confirm password" : "Current password"}
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={newPwd[key]}
                onChange={(e) => setNewPwd((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full px-3.5 py-2.5 pr-10 text-sm bg-surface-container-high border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                placeholder="••••••••"
              />
              {key === "current" && (
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        <Button onClick={changePassword}>Update password</Button>
      </div>

      {/* Active sessions */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-on-surface-variant" />
            <h2 className="text-sm font-semibold text-on-surface">Active Sessions</h2>
          </div>
          <button
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending || sessions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error border border-error/20 rounded-lg hover:bg-error/10 disabled:opacity-40 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out all
          </button>
        </div>

        {sessionsLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-14 bg-white/5 rounded animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant/40">
            No active sessions found
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-xs font-medium text-on-surface">
                    {s.userAgent?.split(")")[0].split("(")[1] || "Unknown device"}
                  </p>
                  <p className="text-[10px] font-mono text-on-surface-variant/40 mt-0.5">
                    {s.ipAddress || "—"} · {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => revokeOne.mutate(s.id)}
                  disabled={revokeOne.isPending}
                  className="p-1.5 text-on-surface-variant/40 hover:text-error rounded-lg hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
