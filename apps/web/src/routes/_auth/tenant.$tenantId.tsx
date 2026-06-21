import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { authFetch } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Building2, User, Shield, Trash2, Ban, CheckCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useAppStore } from "@/store";

export const Route = createFileRoute("/_auth/tenant/$tenantId")({
  component: TenantDetail,
});

function TenantDetail() {
  const { tenantId } = Route.useParams();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);

  if (user?.globalRole !== "SUPER_ADMIN") {
    return (
      <div className="p-12 text-center">
        <Shield className="w-8 h-8 text-error/40 mx-auto mb-3" />
        <p className="text-sm text-on-surface-variant">Super admin only</p>
      </div>
    );
  }

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["organization", tenantId],
    queryFn: async () => {
      const res = await api.organizations[":id"].$get({ param: { id: tenantId } });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const org = (orgData as any)?.data;

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const state = useAppStore.getState();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
      if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
      const res = await authFetch(`/api/organizations/${tenantId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      success("Organization status updated");
    },
    onError: (err: any) => toastError(err.message),
  });

  const deleteTenant = useMutation({
    mutationFn: async () => {
      const res = await api.organizations[":id"].$delete({ param: { id: tenantId } });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      navigate({ to: "/tenants" });
      success("Organization deleted");
    },
    onError: (err: any) => toastError(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
        <div className="h-48 bg-surface-container border border-outline-variant rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!org) {
    return <div className="p-12 text-center text-on-surface-variant/40">Organization not found</div>;
  }

  return (
    <div className="space-y-4">
      <Link
        to="/tenants"
        className="inline-flex items-center gap-1 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        All Organizations
      </Link>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-on-surface">{org.name}</h1>
          <p className="text-xs font-mono text-on-surface-variant/40">{org.id}</p>
        </div>
        <span
          className={`ml-auto inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border ${
            org.status === "active"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
              : "bg-white/8 text-on-surface-variant border-white/10"
          }`}
        >
          {org.status}
        </span>
      </div>

      {/* Details card */}
      <div className="bg-surface-container border border-outline-variant rounded-xl divide-y divide-outline-variant">
        {[
          { label: "Domain", value: org.domain },
          { label: "Created", value: new Date(org.createdAt).toLocaleString() },
          { label: "Updated", value: new Date(org.updatedAt).toLocaleString() },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3">
            <span className="text-xs text-on-surface-variant">{row.label}</span>
            <span className="text-xs font-medium text-on-surface">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-semibold text-on-surface">Actions</h3>

        <div className="flex items-center gap-2">
          {org.status === "active" ? (
            <button
              onClick={() => updateStatus.mutate("suspended")}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 border border-amber-500/20 bg-amber-500/10 rounded-lg hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Suspend organization
            </button>
          ) : (
            <button
              onClick={() => updateStatus.mutate("active")}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Reactivate
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-outline-variant">
          <p className="text-[10px] text-error/60 mb-2">Danger zone — irreversible</p>
          <button
            onClick={() => {
              if (confirm(`Delete "${org.name}" and all its data? This cannot be undone.`)) {
                deleteTenant.mutate();
              }
            }}
            disabled={deleteTenant.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error border border-error/20 rounded-lg hover:bg-error/10 disabled:opacity-40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete organization
          </button>
        </div>
      </div>
    </div>
  );
}
