import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, ShieldCheck, Trash2, Copy, Users } from "lucide-react";
import { useAppStore } from "@/store";
import { PERMISSION_CATALOG, type PermissionEntry } from "@/lib/permissions-catalog";
import { Button, Input, FormError } from "@/components/ui";

function getAuthHeaders() {
  const state = useAppStore.getState();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (state.accessToken) headers["Authorization"] = `Bearer ${state.accessToken}`;
  if (state.tenantId) headers["X-Tenant-ID"] = state.tenantId;
  return headers;
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`/api${path}`, { ...init, headers: { ...getAuthHeaders(), ...(init.headers ?? {}) } });
  const body = await res.json();
  return { res, body };
}

type Role = { id: string; name: string; description: string | null; isSystem: boolean; createdAt: string; };
type Permission = { id: string; roleId: string; resource: string; action: string; };

function PermissionPicker({ selected, onChange }: { selected: PermissionEntry[]; onChange: (e: PermissionEntry[]) => void }) {
  const isChecked = (resource: string, action: string) => selected.some((e) => e.resource === resource && e.action === action);
  const toggle = (resource: string, action: string) => {
    if (isChecked(resource, action)) onChange(selected.filter((e) => !(e.resource === resource && e.action === action)));
    else onChange([...selected, { resource, action }]);
  };
  const toggleResource = (resource: string, actions: readonly { action: string }[]) => {
    const allChecked = actions.every(({ action }) => isChecked(resource, action));
    if (allChecked) onChange(selected.filter((e) => e.resource !== resource));
    else {
      const toAdd = actions.filter(({ action }) => !isChecked(resource, action)).map(({ action }) => ({ resource, action }));
      onChange([...selected, ...toAdd]);
    }
  };

  return (
    <div className="border border-outline-variant rounded-lg overflow-hidden">
      {PERMISSION_CATALOG.map((group, i) => {
        const allChecked = group.actions.every(({ action }) => isChecked(group.resource, action));
        const someChecked = group.actions.some(({ action }) => isChecked(group.resource, action));
        return (
          <div key={group.resource} className={i > 0 ? "border-t border-outline-variant" : ""}>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-surface-container-high">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                onChange={() => toggleResource(group.resource, group.actions)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs font-semibold text-on-surface">{group.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-8 py-2">
              {group.actions.map(({ action, label }) => (
                <label key={action} className="flex items-center gap-2 cursor-pointer py-0.5">
                  <input type="checkbox" checked={isChecked(group.resource, action)} onChange={() => toggle(group.resource, action)} className="w-3.5 h-3.5 rounded accent-primary" />
                  <span className="text-xs text-on-surface-variant">{label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"details" | "permissions">("details");
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { res: roleRes, body: roleBody } = await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({ name: form.name, description: form.description, isSystem: false }),
      });
      if (!roleRes.ok) throw new Error(roleBody?.error?.message || "Failed to create role");
      const newRole: Role = roleBody.data;
      if (selectedPermissions.length > 0) {
        const { res: permRes } = await apiFetch(`/permissions/by-role/${newRole.id}`, {
          method: "PUT",
          body: JSON.stringify({ entries: selectedPermissions }),
        });
        if (!permRes.ok) throw new Error("Role created, but permissions failed to save");
      }
      return newRole;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "details" ? "bg-primary text-on-primary" : "bg-emerald-500/20 text-emerald-300"}`}>
              {step === "details" ? "1" : "✓"}
            </div>
            <span className={`text-xs font-medium ${step === "details" ? "text-primary" : "text-on-surface-variant/50"}`}>Role Details</span>
            <span className="text-on-surface-variant/30 mx-1 text-xs">→</span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "permissions" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant/40"}`}>2</div>
            <span className={`text-xs font-medium ${step === "permissions" ? "text-primary" : "text-on-surface-variant/40"}`}>Permissions</span>
          </div>
          <h3 className="text-sm font-semibold text-on-surface">
            {step === "details" ? "Create Role" : `Set Permissions — "${form.name}"`}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <div className="mb-4 p-3 bg-error-container/20 border border-error/20 rounded-lg text-xs text-error">{error}</div>}
          {step === "details" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Role Name *</label>
                <Input dense type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Support Lead" autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-on-surface">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe this role's responsibilities..." rows={3} className="w-full px-3 py-2 bg-surface-container-high border border-outline-variant rounded-lg text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none" />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-on-surface-variant/60 mb-4">Select the permissions this role should have.</p>
              <PermissionPicker selected={selectedPermissions} onChange={setSelectedPermissions} />
              <p className="text-xs text-on-surface-variant/40 mt-3">{selectedPermissions.length} permission{selectedPermissions.length !== 1 ? "s" : ""} selected</p>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-outline-variant flex gap-2 justify-between shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <div className="flex gap-2">
            {step === "permissions" && (
              <Button variant="secondary" onClick={() => setStep("details")}>Back</Button>
            )}
            {step === "details" ? (
              <Button onClick={() => setStep("permissions")} disabled={!form.name.trim()}>
                Next: Permissions →
              </Button>
            ) : (
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
                {!mutation.isPending && "Create Role"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPermissionsDrawer({ role, onClose }: { role: Role; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: permResponse, isLoading } = useQuery({
    queryKey: ["role-permissions", role.id],
    queryFn: async () => {
      const { body } = await apiFetch(`/permissions/by-role/${role.id}`);
      return body as { data: Permission[] };
    },
  });
  const existing: Permission[] = permResponse?.data ?? [];
  const [selected, setSelected] = useState<PermissionEntry[] | null>(null);
  const effectiveSelected = selected ?? existing.map((p) => ({ resource: p.resource, action: p.action }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { res } = await apiFetch(`/permissions/by-role/${role.id}`, { method: "PUT", body: JSON.stringify({ entries: effectiveSelected }) });
      if (!res.ok) throw new Error("Failed to save permissions");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["role-permissions", role.id] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-outline-variant shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Edit Permissions</h3>
            <p className="text-xs text-on-surface-variant/60 mt-0.5">Manage permissions for <span className="text-on-surface font-medium">{role.name}</span></p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /></div>
          ) : (
            <PermissionPicker selected={effectiveSelected} onChange={setSelected} />
          )}
        </div>
        <div className="px-5 py-4 border-t border-outline-variant flex items-center justify-between shrink-0">
          <span className="text-xs text-on-surface-variant/40">{effectiveSelected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || role.isSystem} loading={mutation.isPending}>
              {!mutation.isPending && "Save Permissions"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteRoleModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const { res, body } = await apiFetch(`/roles/${role.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(body?.error?.message || body?.message || "Failed to delete role");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["roles"] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline-variant rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-on-surface">Delete Role</h3>
        <p className="text-sm text-on-surface-variant">
          Delete <span className="font-semibold text-on-surface">{role.name}</span>? All associated permissions will also be removed. Cannot be undone.
        </p>
        <FormError>{mutation.error ? (mutation.error as Error).message : undefined}</FormError>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={() => mutation.mutate()} disabled={mutation.isPending} loading={mutation.isPending}>
            {!mutation.isPending && "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function WhoHasRoleDrawer({ role, onClose }: { role: Role; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["role-members", role.id],
    queryFn: async () => {
      const { body } = await apiFetch(`/roles/${role.id}/members`);
      return body;
    },
  });
  const members: any[] = (data as any)?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-surface-container border-l border-outline-variant flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Who has "{role.name}"</h3>
            <p className="text-xs text-on-surface-variant/50 mt-0.5">{members.length} user{members.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-variant/40 hover:text-on-surface transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-2" />
              <p className="text-sm text-on-surface-variant/40">No users with this role</p>
            </div>
          ) : members.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-on-surface">{u.firstName} {u.lastName}</p>
                <p className="text-xs text-on-surface-variant/50 truncate">{u.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RolesTable() {
  const [showCreate, setShowCreate] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRole, setDeleteRole] = useState<Role | null>(null);
  const [whoHasRole, setWhoHasRole] = useState<Role | null>(null);
  const qc = useQueryClient();

  const { data: response, isLoading, error } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { body } = await apiFetch("/roles");
      return body as { data: Role[] };
    },
  });

  const roles: Role[] = response?.data ?? [];

  const cloneMutation = useMutation({
    mutationFn: async (role: Role) => {
      const { body: permsBody } = await apiFetch(`/roles/${role.id}/permissions`);
      const permissions: Permission[] = (permsBody as any)?.data ?? [];
      const { res, body } = await apiFetch("/roles", {
        method: "POST",
        body: JSON.stringify({
          name: `${role.name} (copy)`,
          description: role.description,
          permissions: permissions.map((p) => ({ resource: p.resource, action: p.action })),
        }),
      });
      if (!res.ok) throw new Error((body as any)?.error?.message || "Failed to clone");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  return (
    <>
      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
      {editRole && <EditPermissionsDrawer role={editRole} onClose={() => setEditRole(null)} />}
      {deleteRole && <DeleteRoleModal role={deleteRole} onClose={() => setDeleteRole(null)} />}
      {whoHasRole && <WhoHasRoleDrawer role={whoHasRole} onClose={() => setWhoHasRole(null)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-on-surface-variant/50">Manage roles for your organization.</p>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Role
        </Button>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>
        ) : error ? (
          <div className="p-8 text-center text-error text-sm">Failed to load roles.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-outline-variant">
              <tr>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-[11px] font-semibold text-on-surface-variant/50 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {roles.map((role) => (
                <tr key={role.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-on-surface">{role.name}</td>
                  <td className="px-4 py-3 text-sm text-on-surface-variant/60">{role.description || "—"}</td>
                  <td className="px-4 py-3">
                    {role.isSystem
                      ? <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border bg-violet-500/15 text-violet-300 border-violet-500/20">System</span>
                      : <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded border bg-white/8 text-on-surface-variant border-white/10">Custom</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setWhoHasRole(role)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Who has this role">
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => cloneMutation.mutate(role)} disabled={cloneMutation.isPending} className="p-1.5 rounded text-on-surface-variant/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40" title="Clone role">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditRole(role)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-colors" title="Edit Permissions">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                      {!role.isSystem && (
                        <button onClick={() => setDeleteRole(role)} className="p-1.5 rounded text-on-surface-variant/50 hover:text-error hover:bg-error-container/20 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-primary" /></div>
                      <p className="text-sm font-medium text-on-surface">No roles yet</p>
                      <button onClick={() => setShowCreate(true)} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">Create first role</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
